const path = require('path');
const fs = require('fs');
const solc = require('solc');

// Caminho para o contrato Solidity
const contractPath = path.resolve(__dirname, 'contracts', 'MessageStorage.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Configuração do compilador
const input = {
  language: 'Solidity',
  sources: {
    'MessageStorage.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
  },
};

// Compilar o contrato
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Verificar erros de compilação
if (output.errors) {
  output.errors.forEach((err) => {
    console.error(err.formattedMessage);
  });
}

// Salvar o ABI e o bytecode em um arquivo JSON
const contract = output.contracts['MessageStorage.sol'].MessageStorage;
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

const artifact = {
  abi,
  bytecode,
};

const buildPath = path.resolve(__dirname, 'artifacts');
if (!fs.existsSync(buildPath)) {
  fs.mkdirSync(buildPath);
}

fs.writeFileSync(
  path.resolve(buildPath, 'MessageStorage.json'),
  JSON.stringify(artifact, null, 2)
);

console.log('Contrato compilado com sucesso!');
