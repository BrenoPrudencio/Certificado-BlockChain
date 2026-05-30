const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Transfere a propriedade (admin) do contrato AcademicRegistry para outra carteira.
 *
 * Uso:
 *   npx hardhat run scripts/transfer-ownership.js --network localhost
 *
 * Defina o endereço de destino na variável de ambiente NEW_OWNER, ex (PowerShell):
 *   $env:NEW_OWNER="0xSEU_ENDERECO_METAMASK"; npx hardhat run scripts/transfer-ownership.js --network localhost
 */
async function main() {
  const newOwner = process.env.NEW_OWNER;

  if (!newOwner || !ethers.isAddress(newOwner)) {
    throw new Error(
      "Defina um endereço válido em NEW_OWNER.\n" +
      'Ex (PowerShell): $env:NEW_OWNER="0xSeuEndereco"; npx hardhat run scripts/transfer-ownership.js --network localhost'
    );
  }

  // Lê o endereço do contrato gerado pelo deploy
  const deployInfoPath = path.join(__dirname, "../deploy-info.json");
  if (!fs.existsSync(deployInfoPath)) {
    throw new Error("deploy-info.json não encontrado. Faça o deploy primeiro (npm run deploy:local).");
  }
  const { address } = JSON.parse(fs.readFileSync(deployInfoPath, "utf8"));

  const [current] = await ethers.getSigners();
  console.log(`Contrato      : ${address}`);
  console.log(`Owner atual   : ${current.address}`);
  console.log(`Novo owner    : ${newOwner}\n`);

  const contract = await ethers.getContractAt("AcademicRegistry", address);

  const onChainOwner = await contract.owner();
  if (onChainOwner.toLowerCase() !== current.address.toLowerCase()) {
    throw new Error(
      `A conta atual (${current.address}) não é o owner do contrato (${onChainOwner}). ` +
      "Só o owner atual pode transferir a propriedade."
    );
  }

  console.log("Transferindo propriedade...");
  const tx = await contract.transferOwnership(newOwner);
  await tx.wait();

  console.log(`\nPropriedade transferida com sucesso! Novo owner: ${await contract.owner()}`);
}

main().catch((err) => {
  console.error("\nErro:", err.message);
  process.exitCode = 1;
});
