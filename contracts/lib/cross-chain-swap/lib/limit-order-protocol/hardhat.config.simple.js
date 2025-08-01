require('@nomicfoundation/hardhat-verify');
require('@nomicfoundation/hardhat-chai-matchers');
require('hardhat-deploy');
require('dotenv').config();

module.exports = {
    etherscan: {
        apiKey: {
            'base-sepolia': process.env.BASESCAN_API_KEY || 'dummy'
        },
        customChains: [
            {
                network: "base-sepolia",
                chainId: 84532,
                urls: {
                    apiURL: "https://api-sepolia.basescan.org/api",
                    browserURL: "https://sepolia.basescan.org"
                }
            }
        ]
    },
    solidity: {
        version: '0.8.23',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1_000_000,
            },
            evmVersion: 'shanghai',
            viaIR: true,
        },
    },
    networks: {
        'base-sepolia': {
            url: 'https://sepolia.base.org',
            chainId: 84532,
            accounts: {
                mnemonic: 'test test test test test test test test test test test junk'
            },
            gasPrice: 1000000000, // 1 gwei
            blockGasLimit: 30000000
        }
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
};