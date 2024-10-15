import { publishDotMove } from "./publish";


const publish = async (network: 'mainnet' | 'testnet') => {
    await publishDotMove(network, '/Users/manosliolios/.sui/sui_config/client.yaml');
}

publish('mainnet');
