require('@matterlabs/hardhat-zksync-deploy');
require('@matterlabs/hardhat-zksync-solc');
require('@matterlabs/hardhat-zksync-verify');
require('@nomicfoundation/hardhat-verify');
require('@nomicfoundation/hardhat-chai-matchers');
require('solidity-coverage');
require('hardhat-dependency-compiler');
require('hardhat-deploy');
require('hardhat-gas-reporter');
require('hardhat-tracer');
require('dotenv').config();

const { Networks, getNetwork } = require('@1inch/solidity-utils/hardhat-setup');

const { networks, etherscan } = (new Networks()).registerAll();

// Add Base Sepolia testnet configuration
const baseSepoliaConfig = {
    url: 'https://sepolia.base.org',
    chainId: 84532,
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : {
        mnemonic: 'test test test test test test test test test test test junk'
    },
    gasPrice: 1000000000, // 1 gwei
    blockGasLimit: 30000000
};

// Merge Base Sepolia into networks
const allNetworks = {
    ...networks,
    'base-sepolia': baseSepoliaConfig
};

module.exports = {
    etherscan: {
        ...etherscan,
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
    tracer: {
        enableAllOpcodes: true,
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
    networks: allNetworks,
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    gasReporter: {
        enable: true,
        currency: 'USD',
    },
    dependencyCompiler: {
        paths: [
            '@1inch/solidity-utils/contracts/mocks/TokenCustomDecimalsMock.sol',
            '@1inch/solidity-utils/contracts/mocks/TokenMock.sol',
            '@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol',
        ],
    },
    zksolc: {
        version: '1.4.0',
        compilerSource: 'binary',
        settings: {},
    },
};