const path = require('path');
const fs = require('fs');
const solc = require('solc');

// Função para compilar um contrato
function compileContract(contractName) {
  // Caminho para o contrato Solidity
  const contractPath = path.resolve(__dirname, 'contracts', `${contractName}.sol`);
  const source = fs.readFileSync(contractPath, 'utf8');

  // Configuração do compilador
  const input = {
    language: 'Solidity',
    sources: {
      [`${contractName}.sol`]: {
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
    throw new Error(`Erro ao compilar o contrato ${contractName}`);
  }

  // Extrair ABI e bytecode
  const contract = output.contracts[`${contractName}.sol`][contractName];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  return { abi, bytecode };
}

// Função para salvar o ABI e o bytecode em um arquivo JSON
function saveArtifact(contractName, artifact) {
  const buildPath = path.resolve(__dirname, 'artifacts');
  if (!fs.existsSync(buildPath)) {
    fs.mkdirSync(buildPath);
  }

  fs.writeFileSync(
    path.resolve(buildPath, `${contractName}.json`),
    JSON.stringify(artifact, null, 2)
  );

  console.log(`Contrato ${contractName} compilado com sucesso!`);
}

// Compilar e salvar os contratos
try {
  // Compilar MessageStorage
  const messageStorageArtifact = compileContract('MessageStorage');
  saveArtifact('MessageStorage', messageStorageArtifact);

  // Compilar CounterEvm
  const counterEvmArtifact = compileContract('CounterEvm');
  saveArtifact('CounterEvm', counterEvmArtifact);
} catch (e) {
  console.error(e.message);
}