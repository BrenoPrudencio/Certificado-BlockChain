const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("─────────────────────────────────────────────");
  console.log(" Registro Acadêmico Blockchain - Deploy");
  console.log("─────────────────────────────────────────────\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Deployer  : ${deployer.address}`);
  console.log(`Saldo     : ${ethers.formatEther(balance)} ETH`);
  console.log(`Rede      : ${(await ethers.provider.getNetwork()).name}\n`);

  console.log("Compilando e fazendo deploy do AcademicRegistry...");
  const AcademicRegistry = await ethers.getContractFactory("AcademicRegistry");
  const contract = await AcademicRegistry.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\nContrato deployed em: ${address}`);

  // Salva o endereço e ABI no frontend para uso imediato
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/AcademicRegistry.sol/AcademicRegistry.json"
  );

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const deployInfo = {
      address,
      abi: artifact.abi,
      network: (await ethers.provider.getNetwork()).name,
      deployedAt: new Date().toISOString(),
    };

    const frontendConfigPath = path.join(__dirname, "../frontend/js/contract-config.js");
    const configContent = `// Auto-gerado por scripts/deploy.js — não editar manualmente
const CONTRACT_ADDRESS = "${address}";
const CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)};
`;
    fs.writeFileSync(frontendConfigPath, configContent);
    console.log(`\nConfiguração do frontend salva em: frontend/js/contract-config.js`);

    // Também salva um JSON para referência
    fs.writeFileSync(
      path.join(__dirname, "../deploy-info.json"),
      JSON.stringify(deployInfo, null, 2)
    );
    console.log("Informações do deploy salvas em: deploy-info.json");
  }

  const netName = (await ethers.provider.getNetwork()).name;
  const isLocal = netName === "localhost" || netName === "hardhat" || netName === "unknown";

  console.log("\n─────────────────────────────────────────────");
  console.log(" Deploy concluído com sucesso!");
  console.log("─────────────────────────────────────────────");
  console.log(`\n Próximos passos:`);
  if (isLocal) {
    console.log(` 1. O frontend já aponta para este endereço na rede local (NETWORKS["0x7a69"]).`);
  } else {
    console.log(` 1. Em frontend/js/app.js, cole este endereço em NETWORKS["0xaa36a7"].address (Sepolia):`);
    console.log(`    ${address}`);
  }
  console.log(` 2. Rode "npm run serve" e abra http://localhost:3000`);
  console.log(` 3. Conecte sua carteira MetaMask na rede ${isLocal ? "Hardhat Local" : "Sepolia"}`);
  console.log(" 4. O owner (administrador) do contrato é: " + deployer.address);
}

main().catch((err) => {
  console.error("\nErro no deploy:", err);
  process.exitCode = 1;
});
