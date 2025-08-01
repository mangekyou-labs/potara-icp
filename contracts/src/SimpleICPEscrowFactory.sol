// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import { IERC20 } from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title Simple ICP-Compatible Escrow Factory
 * @notice Minimal factory for demonstrating ICP integration with cross-chain atomic swaps
 * @dev This is a simplified version for MVP demonstration
 */
contract SimpleICPEscrowFactory {
    
    // ICP Chain ID for identification
    uint256 public constant ICP_CHAIN_ID = 999888;
    
    // Events for ICP integration
    event ICPEscrowRequested(
        bytes32 indexed orderHash,
        bytes32 indexed hashlock,
        address indexed taker,
        string canisterId,
        uint256 amount,
        address token
    );
    
    event ICPEscrowConfirmed(
        bytes32 indexed orderHash,
        string canisterId
    );
    
    event ICPSecretRevealed(
        bytes32 indexed orderHash,
        bytes32 secret,
        string canisterId
    );
    
    // Storage
    mapping(bytes32 => string) public icpCanisterIds; // orderHash => canister ID
    mapping(bytes32 => bool) public icpEscrowExists; // orderHash => exists
    mapping(bytes32 => uint256) public escrowAmounts; // orderHash => amount
    mapping(bytes32 => address) public escrowTokens; // orderHash => token
    mapping(bytes32 => address) public escrowTakers; // orderHash => taker
    
    // Errors
    error ICPEscrowAlreadyExists();
    error ICPEscrowNotFound();
    error InvalidParameters();
    error UnauthorizedCaller();
    
    /**
     * @notice Creates an ICP escrow request
     * @param orderHash Unique identifier for the cross-chain order
     * @param hashlock Hash of the secret for atomic swap
     * @param taker Address that can claim the escrow
     * @param token Token contract address (or zero for ETH)
     * @param amount Amount of tokens/ETH in the escrow
     * @param icpCanisterId ICP canister ID that will hold the destination funds
     */
    function createICPEscrow(
        bytes32 orderHash,
        bytes32 hashlock,
        address taker,
        address token,
        uint256 amount,
        string calldata icpCanisterId
    ) external payable {
        // Validate inputs
        require(orderHash != bytes32(0), "Invalid order hash");
        require(hashlock != bytes32(0), "Invalid hashlock");
        require(taker != address(0), "Invalid taker");
        require(amount > 0, "Invalid amount");
        require(bytes(icpCanisterId).length > 0, "Invalid canister ID");
        require(!icpEscrowExists[orderHash], "Escrow already exists");
        
        // For ETH escrows, validate msg.value
        if (token == address(0)) {
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            require(msg.value == 0, "Should not send ETH for token escrow");
            // For token escrows, the caller should have approved this contract
            require(IERC20(token).allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
            require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        }
        
        // Store escrow data
        icpCanisterIds[orderHash] = icpCanisterId;
        icpEscrowExists[orderHash] = true;
        escrowAmounts[orderHash] = amount;
        escrowTokens[orderHash] = token;
        escrowTakers[orderHash] = taker;
        
        // Emit event for ICP canister to process
        emit ICPEscrowRequested(
            orderHash,
            hashlock,
            taker,
            icpCanisterId,
            amount,
            token
        );
    }
    
    /**
     * @notice Confirms ICP escrow has been created on ICP side
     * @dev In production, this would have access control
     * @param orderHash The order hash
     * @param canisterId The ICP canister ID
     */
    function confirmICPEscrow(
        bytes32 orderHash,
        string calldata canisterId
    ) external {
        require(icpEscrowExists[orderHash], "Escrow does not exist");
        require(
            keccak256(bytes(icpCanisterIds[orderHash])) == keccak256(bytes(canisterId)),
            "Canister ID mismatch"
        );
        
        emit ICPEscrowConfirmed(orderHash, canisterId);
    }
    
    /**
     * @notice Triggers refund when secret is revealed on ICP
     * @dev In production, this would be called by oracles monitoring ICP
     * @param orderHash The order hash
     * @param secret The revealed secret
     */
    function claimWithSecret(
        bytes32 orderHash,
        bytes32 secret
    ) external {
        require(icpEscrowExists[orderHash], "Escrow does not exist");
        require(msg.sender == escrowTakers[orderHash], "Unauthorized caller");
        
        // In a real implementation, we would verify the secret matches hashlock
        // For MVP, we'll just emit the event and transfer funds
        
        address token = escrowTokens[orderHash];
        uint256 amount = escrowAmounts[orderHash];
        
        // Clean up storage
        delete icpCanisterIds[orderHash];
        delete icpEscrowExists[orderHash];
        delete escrowAmounts[orderHash];
        delete escrowTokens[orderHash];
        delete escrowTakers[orderHash];
        
        // Transfer funds to taker
        if (token == address(0)) {
            // Transfer ETH
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Transfer tokens
            require(IERC20(token).transfer(msg.sender, amount), "Token transfer failed");
        }
        
        emit ICPSecretRevealed(orderHash, secret, icpCanisterIds[orderHash]);
    }
    
    /**
     * @notice Emergency cancellation (simplified for MVP)
     * @param orderHash The order hash to cancel
     */
    function cancelEscrow(bytes32 orderHash) external {
        require(icpEscrowExists[orderHash], "Escrow does not exist");
        
        // In production, add proper timelock and access control
        // For MVP, allow creator to cancel
        
        address token = escrowTokens[orderHash];
        uint256 amount = escrowAmounts[orderHash];
        
        // Clean up storage
        delete icpCanisterIds[orderHash];
        delete icpEscrowExists[orderHash];
        delete escrowAmounts[orderHash];
        delete escrowTokens[orderHash];
        delete escrowTakers[orderHash];
        
        // Refund to msg.sender (should add proper access control)
        if (token == address(0)) {
            // Refund ETH
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "ETH refund failed");
        } else {
            // Refund tokens
            require(IERC20(token).transfer(msg.sender, amount), "Token refund failed");
        }
    }
    
    /**
     * @notice Get ICP canister ID for an order
     * @param orderHash The order hash
     * @return The ICP canister ID
     */
    function getICPCanisterId(bytes32 orderHash) external view returns (string memory) {
        return icpCanisterIds[orderHash];
    }
    
    /**
     * @notice Check if ICP escrow exists
     * @param orderHash The order hash
     * @return True if escrow exists
     */
    function hasICPEscrow(bytes32 orderHash) external view returns (bool) {
        return icpEscrowExists[orderHash];
    }
    
    /**
     * @notice Get escrow details
     * @param orderHash The order hash
     * @return canisterId ICP canister ID
     * @return amount Escrow amount
     * @return token Token address (zero for ETH)
     * @return taker Taker address
     */
    function getEscrowDetails(bytes32 orderHash) 
        external 
        view 
        returns (
            string memory canisterId,
            uint256 amount,
            address token,
            address taker
        ) 
    {
        return (
            icpCanisterIds[orderHash],
            escrowAmounts[orderHash],
            escrowTokens[orderHash],
            escrowTakers[orderHash]
        );
    }
}