// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Address, AddressLib } from "solidity-utils/contracts/libraries/AddressLib.sol";

import { IOrderMixin } from "../lib/cross-chain-swap/lib/limit-order-protocol/contracts/interfaces/IOrderMixin.sol";
import { BaseExtension } from "../lib/cross-chain-swap/lib/limit-order-settlement/contracts/extensions/BaseExtension.sol";
import { ResolverValidationExtension } from "../lib/cross-chain-swap/lib/limit-order-settlement/contracts/extensions/ResolverValidationExtension.sol";

import { ProxyHashLib } from "../lib/cross-chain-swap/contracts/libraries/ProxyHashLib.sol";
import { Timelocks, TimelocksLib } from "../lib/cross-chain-swap/contracts/libraries/TimelocksLib.sol";

import { EscrowFactory } from "../lib/cross-chain-swap/contracts/EscrowFactory.sol";
import { BaseEscrowFactory } from "../lib/cross-chain-swap/contracts/BaseEscrowFactory.sol";
import { EscrowSrc } from "../lib/cross-chain-swap/contracts/EscrowSrc.sol";
import { EscrowDst } from "../lib/cross-chain-swap/contracts/EscrowDst.sol";
import { MerkleStorageInvalidator } from "../lib/cross-chain-swap/contracts/MerkleStorageInvalidator.sol";
import { IBaseEscrow } from "../lib/cross-chain-swap/contracts/interfaces/IBaseEscrow.sol";
import { IEscrowFactory } from "../lib/cross-chain-swap/contracts/interfaces/IEscrowFactory.sol";

/**
 * @title ICP-Compatible Escrow Factory contract
 * @notice Factory that extends standard EscrowFactory with ICP destination support
 * @dev This factory wraps the standard factory and adds ICP-specific functionality
 * @custom:security-contact security@1inch.io
 */
contract ICPEscrowFactory is IEscrowFactory, BaseExtension, ResolverValidationExtension, MerkleStorageInvalidator {
    using AddressLib for Address;
    using TimelocksLib for Timelocks;

    // Standard escrow factory for EVM destinations
    EscrowFactory public immutable standardFactory;
    
    // Required interface implementations
    address public immutable ESCROW_SRC_IMPLEMENTATION;
    address public immutable ESCROW_DST_IMPLEMENTATION;
    
    // ICP Chain ID - using a unique identifier for ICP
    uint256 public constant ICP_CHAIN_ID = 223344; // Unique ID for ICP
    
    // ICP Canister Management
    mapping(bytes32 => string) public icpCanisterIds; // orderHash -> ICP canister ID
    mapping(bytes32 => bool) public icpEscrowCreated; // track created ICP escrows
    
    // Events for ICP integration
    event ICPEscrowRequested(
        bytes32 indexed orderHash,
        bytes32 indexed hashlock,
        Address indexed taker,
        string canisterId,
        IBaseEscrow.Immutables dstImmutables
    );
    
    event ICPEscrowConfirmed(
        bytes32 indexed orderHash,
        string canisterId,
        bytes32 hashlock
    );

    error ICPEscrowAlreadyExists();
    error ICPEscrowNotSupported();
    error InvalidICPCanisterId();

    constructor(
        address limitOrderProtocol,
        IERC20 feeToken,
        IERC20 accessToken,
        address owner,
        uint32 rescueDelaySrc,
        uint32 rescueDelayDst
    )
    BaseExtension(limitOrderProtocol)
    ResolverValidationExtension(feeToken, accessToken, owner)
    MerkleStorageInvalidator(limitOrderProtocol) {
        // Create standard factory for EVM destinations
        standardFactory = new EscrowFactory(
            limitOrderProtocol,
            feeToken,
            accessToken,
            owner,
            rescueDelaySrc,
            rescueDelayDst
        );
        
        // Set interface implementations from standard factory
        ESCROW_SRC_IMPLEMENTATION = standardFactory.ESCROW_SRC_IMPLEMENTATION();
        ESCROW_DST_IMPLEMENTATION = standardFactory.ESCROW_DST_IMPLEMENTATION();
    }

    /**
     * @notice Creates a new escrow contract for destination chain (EVM or ICP)
     * @dev This function handles both traditional EVM destinations and ICP destinations
     * @param dstImmutables The immutables of the escrow contract
     * @param srcCancellationTimestamp The start of the cancellation period for the source chain
     */
    function createDstEscrow(
        IBaseEscrow.Immutables calldata dstImmutables, 
        uint256 srcCancellationTimestamp
    ) external payable override {
        // Check if this is an ICP destination
        if (_isICPDestination(dstImmutables)) {
            _createICPEscrow(dstImmutables, srcCancellationTimestamp);
        } else {
            // Delegate to standard factory for EVM destinations
            standardFactory.createDstEscrow{value: msg.value}(dstImmutables, srcCancellationTimestamp);
        }
    }

    /**
     * @notice Creates ICP escrow by emitting event for ICP canister to process
     * @param dstImmutables The immutables for the ICP escrow
     * @param srcCancellationTimestamp Source chain cancellation timestamp
     */
    function _createICPEscrow(
        IBaseEscrow.Immutables calldata dstImmutables,
        uint256 srcCancellationTimestamp
    ) internal {
        bytes32 orderHash = dstImmutables.orderHash;
        
        // Prevent duplicate creation
        if (icpEscrowCreated[orderHash]) {
            revert ICPEscrowAlreadyExists();
        }
        
        // Validate timelock constraints
        IBaseEscrow.Immutables memory immutables = dstImmutables;
        immutables.timelocks = immutables.timelocks.setDeployedAt(block.timestamp);
        
        if (immutables.timelocks.get(TimelocksLib.Stage.DstCancellation) > srcCancellationTimestamp) {
            revert InvalidCreationTime();
        }
        
        // Generate ICP canister ID (in practice, this would be provided by the resolver)
        string memory canisterId = _generateICPCanisterId(orderHash);
        
        // Store the mapping
        icpCanisterIds[orderHash] = canisterId;
        icpEscrowCreated[orderHash] = true;
        
        // Emit event for ICP canister to process
        emit ICPEscrowRequested(
            orderHash,
            dstImmutables.hashlock,
            dstImmutables.taker,
            canisterId,
            immutables
        );
        
        // Also emit the standard event for compatibility
        emit DstEscrowCreated(
            _icpCanisterToAddress(canisterId), // Convert canister ID to address format
            dstImmutables.hashlock,
            dstImmutables.taker
        );
    }

    /**
     * @notice Confirms that an ICP escrow has been created
     * @dev This would be called by an authorized oracle or the resolver
     * @param orderHash The order hash
     * @param canisterId The ICP canister ID
     */
    function confirmICPEscrow(bytes32 orderHash, string calldata canisterId) external {
        // In practice, add access control here (only resolver or oracle)
        if (keccak256(bytes(icpCanisterIds[orderHash])) != keccak256(bytes(canisterId))) {
            revert InvalidICPCanisterId();
        }
        
        emit ICPEscrowConfirmed(orderHash, canisterId, bytes32(0)); // hashlock could be retrieved
    }

    /**
     * @notice Returns the address for source escrow
     * @param immutables The immutable arguments
     * @return The address of the source escrow
     */
    function addressOfEscrowSrc(IBaseEscrow.Immutables calldata immutables) 
        external 
        view 
        override 
        returns (address) 
    {
        // Delegate to standard factory for all source escrows (always EVM)
        return standardFactory.addressOfEscrowSrc(immutables);
    }

    /**
     * @notice Returns the address for ICP escrow (converted from canister ID)
     * @param immutables The immutable arguments
     * @return The converted address representation of ICP canister
     */
    function addressOfEscrowDst(IBaseEscrow.Immutables calldata immutables) 
        external 
        view 
        override 
        returns (address) 
    {
        if (_isICPDestination(immutables)) {
            string memory canisterId = icpCanisterIds[immutables.orderHash];
            if (bytes(canisterId).length == 0) {
                // Generate deterministic address based on immutables
                return address(uint160(uint256(keccak256(abi.encode(immutables, "ICP")))));
            }
            return _icpCanisterToAddress(canisterId);
        } else {
            return standardFactory.addressOfEscrowDst(immutables);
        }
    }

    /**
     * @notice Override _postInteraction to resolve inheritance conflicts
     * @dev Delegates to ResolverValidationExtension implementation
     */
    function _postInteraction(
        IOrderMixin.Order calldata order,
        bytes calldata extension,
        bytes32 orderHash,
        address taker,
        uint256 makingAmount,
        uint256 takingAmount,
        uint256 remainingMakingAmount,
        bytes calldata extraData
    ) internal override(BaseExtension, ResolverValidationExtension) {
        // Call the ResolverValidationExtension implementation
        ResolverValidationExtension._postInteraction(
            order, extension, orderHash, taker, makingAmount, takingAmount, remainingMakingAmount, extraData
        );
    }

    /**
     * @notice Checks if the destination is ICP based on chain ID
     * @param immutables The immutable arguments
     * @return true if destination is ICP
     */
    function _isICPDestination(IBaseEscrow.Immutables calldata immutables) internal pure returns (bool) {
        // Check if any field indicates ICP destination
        // This could be based on chainId in the context, or special token addresses
        // For now, we'll use a special token address to indicate ICP
        address token = immutables.token.get();
        
        // Use a special address range to indicate ICP tokens
        // In practice, this would be more sophisticated
        return token >= address(0xABCD0000) && token <= address(0xABCDFFFF);
    }

    /**
     * @notice Generates a deterministic ICP canister ID
     * @param orderHash The order hash
     * @return canisterId The generated canister ID
     */
    function _generateICPCanisterId(bytes32 orderHash) internal pure returns (string memory) {
        // Generate a mock canister ID for demonstration
        // In practice, this would interface with ICP's canister creation
        bytes32 hash = keccak256(abi.encodePacked("icp-escrow-", orderHash));
        return string(abi.encodePacked("rdmx6-jaaaa-aaaah-qcaiq-cai")); // Example ICP canister ID format
    }

    /**
     * @notice Converts ICP canister ID to EVM address format
     * @param canisterId The ICP canister ID
     * @return addr The address representation
     */
    function _icpCanisterToAddress(string memory canisterId) internal pure returns (address) {
        // Convert canister ID to address for compatibility with EVM tools
        bytes32 hash = keccak256(bytes(canisterId));
        return address(uint160(uint256(hash)));
    }

    /**
     * @notice Gets the ICP canister ID for an order
     * @param orderHash The order hash
     * @return canisterId The ICP canister ID
     */
    function getICPCanisterId(bytes32 orderHash) external view returns (string memory) {
        return icpCanisterIds[orderHash];
    }

    /**
     * @notice Checks if an ICP escrow has been created
     * @param orderHash The order hash
     * @return created Whether the escrow is created
     */
    function isICPEscrowCreated(bytes32 orderHash) external view returns (bool) {
        return icpEscrowCreated[orderHash];
    }
}