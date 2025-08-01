// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title Minimal Test Escrow contract for cross-chain atomic swap testing with token support
 * @dev Simplified version of EVM escrow for MVP testing with ICP, now supporting ERC20 tokens
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract TestEscrowMinimal {
    
    struct EscrowState {
        bytes32 orderHash;
        bytes32 hashlock;    // Keccak256 hash of secret
        address maker;       // User who initiated swap
        address taker;       // Resolver
        address token;       // ERC20 token address (address(0) for ETH)
        uint256 amount;      // Amount locked
        uint256 deployedAt;  // Block timestamp of deployment
        bool withdrawn;      // Whether withdrawn
        bool cancelled;      // Whether cancelled
        
        // Timelocks (seconds from deployment)
        uint256 withdrawalTime;    // When withdrawal is allowed
        uint256 cancellationTime;  // When cancellation is allowed
    }
    
    mapping(bytes32 => EscrowState) public escrows;
    
    event EscrowCreated(bytes32 indexed orderHash, bytes32 hashlock, address maker, address taker, address token, uint256 amount);
    event Withdrawal(bytes32 indexed orderHash, bytes32 secret, address token, uint256 amount);
    event EscrowCancelled(bytes32 indexed orderHash, address token, uint256 amount);
    
    error InvalidSecret();
    error InvalidTime();
    error EscrowNotFound();
    error AlreadyWithdrawn();
    error AlreadyCancelled();
    error InvalidCaller();
    
    /**
     * @dev Creates a new escrow with the given parameters and locks tokens
     */
    function createEscrow(
        bytes32 orderHash,
        bytes32 hashlock,
        address maker,
        address taker,
        address token,
        uint256 amount,
        uint256 withdrawalTime,
        uint256 cancellationTime
    ) external payable {
        require(escrows[orderHash].deployedAt == 0, "Escrow already exists");
        require(amount > 0, "Amount must be greater than 0");
        
        // Handle token transfer
        if (token == address(0)) {
            // Native ETH transfer
            require(msg.value == amount, "ETH amount mismatch");
        } else {
            // ERC20 token transfer
            require(msg.value == 0, "No ETH needed for ERC20");
            require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        }
        
        escrows[orderHash] = EscrowState({
            orderHash: orderHash,
            hashlock: hashlock,
            maker: maker,
            taker: taker,
            token: token,
            amount: amount,
            deployedAt: block.timestamp,
            withdrawn: false,
            cancelled: false,
            withdrawalTime: withdrawalTime,
            cancellationTime: cancellationTime
        });
        
        emit EscrowCreated(orderHash, hashlock, maker, taker, token, amount);
    }
    
    /**
     * @dev Withdraws from escrow with secret verification
     */
    function withdraw(bytes32 orderHash, bytes32 secret) external {
        EscrowState storage escrow = escrows[orderHash];
        
        if (escrow.deployedAt == 0) revert EscrowNotFound();
        if (escrow.withdrawn) revert AlreadyWithdrawn();
        if (escrow.cancelled) revert AlreadyCancelled();
        if (msg.sender != escrow.taker) revert InvalidCaller();
        if (block.timestamp < escrow.deployedAt + escrow.withdrawalTime) revert InvalidTime();
        if (keccak256(abi.encodePacked(secret)) != escrow.hashlock) revert InvalidSecret();
        
        escrow.withdrawn = true;
        
        // Transfer tokens to the taker (resolver)
        if (escrow.token == address(0)) {
            // Transfer ETH
            (bool success,) = escrow.taker.call{value: escrow.amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Transfer ERC20 tokens
            require(IERC20(escrow.token).transfer(escrow.taker, escrow.amount), "Token transfer failed");
        }
        
        emit Withdrawal(orderHash, secret, escrow.token, escrow.amount);
    }
    
    /**
     * @dev Cancels escrow after cancellation time
     */
    function cancel(bytes32 orderHash) external {
        EscrowState storage escrow = escrows[orderHash];
        
        if (escrow.deployedAt == 0) revert EscrowNotFound();
        if (escrow.withdrawn) revert AlreadyWithdrawn();
        if (escrow.cancelled) revert AlreadyCancelled();
        if (msg.sender != escrow.maker) revert InvalidCaller();
        if (block.timestamp < escrow.deployedAt + escrow.cancellationTime) revert InvalidTime();
        
        escrow.cancelled = true;
        
        // Refund tokens to the maker (original depositor)
        if (escrow.token == address(0)) {
            // Refund ETH
            (bool success,) = escrow.maker.call{value: escrow.amount}("");
            require(success, "ETH refund failed");
        } else {
            // Refund ERC20 tokens
            require(IERC20(escrow.token).transfer(escrow.maker, escrow.amount), "Token refund failed");
        }
        
        emit EscrowCancelled(orderHash, escrow.token, escrow.amount);
    }
    
    /**
     * @dev Helper function to generate hashlock from secret (for testing)
     */
    function generateHashlock(bytes32 secret) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(secret));
    }
    
    /**
     * @dev Get escrow state
     */
    function getEscrow(bytes32 orderHash) external view returns (EscrowState memory) {
        return escrows[orderHash];
    }
}