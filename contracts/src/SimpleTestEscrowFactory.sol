pragma solidity 0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * Simple mock escrow factory for testing ICP integration
 * This is a minimal implementation that provides the basic interface needed for testing
 */
contract SimpleTestEscrowFactory is Ownable {
    event SrcEscrowCreated(
        bytes32 indexed orderHash,
        address indexed escrow,
        address indexed maker,
        uint256 amount
    );

    event DstEscrowCreated(
        bytes32 indexed orderHash,
        address indexed escrow,
        address indexed taker,
        uint256 amount
    );

    mapping(bytes32 => address) public srcEscrows;
    mapping(bytes32 => address) public dstEscrows;

    constructor() Ownable(msg.sender) {}

    /**
     * Create source escrow (simplified for testing)
     */
    function createSrcEscrow(
        bytes32 orderHash,
        address maker,
        uint256 amount
    ) external returns (address) {
        // For testing, we'll just emit an event and return a mock address
        address mockEscrow = address(uint160(uint256(orderHash)));
        srcEscrows[orderHash] = mockEscrow;
        
        emit SrcEscrowCreated(orderHash, mockEscrow, maker, amount);
        return mockEscrow;
    }

    /**
     * Create destination escrow (simplified for testing)
     */
    function createDstEscrow(
        bytes32 orderHash,
        address taker,
        uint256 amount
    ) external returns (address) {
        // For testing, we'll just emit an event and return a mock address
        address mockEscrow = address(uint160(uint256(orderHash) + 1));
        dstEscrows[orderHash] = mockEscrow;
        
        emit DstEscrowCreated(orderHash, mockEscrow, taker, amount);
        return mockEscrow;
    }

    /**
     * Get source escrow address
     */
    function getSrcEscrowAddress(bytes32 orderHash) external view returns (address) {
        return srcEscrows[orderHash];
    }

    /**
     * Get destination escrow address
     */
    function getDstEscrowAddress(bytes32 orderHash) external view returns (address) {
        return dstEscrows[orderHash];
    }
} 