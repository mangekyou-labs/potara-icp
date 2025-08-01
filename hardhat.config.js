/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      // Configuration for local hardhat network
      accounts: {
        count: 10,
        accountsBalance: "10000000000000000000000" // 10000 ETH per account
      },
      chainId: 31337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  paths: {
    sources: "./contracts/src",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};