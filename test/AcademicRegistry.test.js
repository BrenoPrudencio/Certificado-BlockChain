const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AcademicRegistry", function () {
  let contract;
  let owner;
  let user1;
  let user2;

  // Dados de diploma de exemplo
  const sampleDiploma = {
    studentName: "João da Silva",
    studentId: "123.456.789-00",
    course: "Ciência da Computação",
    completionDate: "15/12/2023",
    // Hash SHA-256 válido (64 caracteres hex)
    pdfHash: "a3f5c2d1e4b6a8d0f2e4c6b8a0d2f4e6c8b0a2d4f6e8c0b2a4d6f8e0c2b4a6d8",
  };

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const AcademicRegistry = await ethers.getContractFactory("AcademicRegistry");
    contract = await AcademicRegistry.deploy();
    await contract.waitForDeployment();
  });

  // ─── Deploy ────────────────────────────────────────────────────────────
  describe("Deploy", function () {
    it("Deve definir o deployer como owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Deve iniciar com zero diplomas", async function () {
      expect(await contract.totalDiplomas()).to.equal(0);
    });
  });

  // ─── Registro de Diploma ───────────────────────────────────────────────
  describe("Registro de Diploma", function () {
    it("Owner deve conseguir registrar um diploma", async function () {
      await expect(
        contract.registerDiploma(
          sampleDiploma.studentName,
          sampleDiploma.studentId,
          sampleDiploma.course,
          sampleDiploma.completionDate,
          sampleDiploma.pdfHash
        )
      ).to.not.be.reverted;
    });

    it("Deve incrementar o contador de diplomas", async function () {
      await contract.registerDiploma(
        sampleDiploma.studentName,
        sampleDiploma.studentId,
        sampleDiploma.course,
        sampleDiploma.completionDate,
        sampleDiploma.pdfHash
      );
      expect(await contract.totalDiplomas()).to.equal(1);
    });

    it("Deve emitir o evento DiplomaRegistered", async function () {
      await expect(
        contract.registerDiploma(
          sampleDiploma.studentName,
          sampleDiploma.studentId,
          sampleDiploma.course,
          sampleDiploma.completionDate,
          sampleDiploma.pdfHash
        )
      )
        .to.emit(contract, "DiplomaRegistered")
        .withArgs(
          sampleDiploma.studentId,
          sampleDiploma.studentName,
          sampleDiploma.course,
          sampleDiploma.completionDate,
          sampleDiploma.pdfHash,
          (timestamp) => timestamp > 0n
        );
    });

    it("Deve rejeitar registro de usuário não-owner", async function () {
      await expect(
        contract.connect(user1).registerDiploma(
          sampleDiploma.studentName,
          sampleDiploma.studentId,
          sampleDiploma.course,
          sampleDiploma.completionDate,
          sampleDiploma.pdfHash
        )
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("Deve rejeitar registro duplicado para o mesmo ID", async function () {
      await contract.registerDiploma(
        sampleDiploma.studentName,
        sampleDiploma.studentId,
        sampleDiploma.course,
        sampleDiploma.completionDate,
        sampleDiploma.pdfHash
      );

      await expect(
        contract.registerDiploma(
          "Maria Souza",
          sampleDiploma.studentId, // mesmo ID
          "Engenharia",
          "20/06/2024",
          "b4e6c8a0d2f4e6c8b0a2d4f6e8c0b2a4d6f8e0c2b4a6d8f0e2c4b6a8d0f2e4c6"
        )
      ).to.be.revertedWith("Diploma ja registrado para este identificador");
    });

    it("Deve rejeitar hash SHA-256 com tamanho inválido", async function () {
      await expect(
        contract.registerDiploma(
          sampleDiploma.studentName,
          sampleDiploma.studentId,
          sampleDiploma.course,
          sampleDiploma.completionDate,
          "hashcurto"
        )
      ).to.be.revertedWith("Hash SHA-256 invalido (deve ter 64 caracteres hex)");
    });

    it("Deve rejeitar campos obrigatórios vazios", async function () {
      await expect(
        contract.registerDiploma("", sampleDiploma.studentId, sampleDiploma.course, sampleDiploma.completionDate, sampleDiploma.pdfHash)
      ).to.be.revertedWith("Nome do aluno e obrigatorio");

      await expect(
        contract.registerDiploma(sampleDiploma.studentName, "", sampleDiploma.course, sampleDiploma.completionDate, sampleDiploma.pdfHash)
      ).to.be.revertedWith("Identificador do aluno e obrigatorio");
    });

    it("Deve rejeitar hash de PDF duplicado", async function () {
      await contract.registerDiploma(
        sampleDiploma.studentName,
        sampleDiploma.studentId,
        sampleDiploma.course,
        sampleDiploma.completionDate,
        sampleDiploma.pdfHash
      );

      await expect(
        contract.registerDiploma(
          "Outro Aluno",
          "987.654.321-00",
          "Engenharia",
          "10/01/2024",
          sampleDiploma.pdfHash // mesmo hash
        )
      ).to.be.revertedWith("Este hash de PDF ja foi registrado");
    });
  });

  // ─── Consulta de Diploma ───────────────────────────────────────────────
  describe("Consulta de Diploma", function () {
    beforeEach(async function () {
      await contract.registerDiploma(
        sampleDiploma.studentName,
        sampleDiploma.studentId,
        sampleDiploma.course,
        sampleDiploma.completionDate,
        sampleDiploma.pdfHash
      );
    });

    it("Deve retornar os dados corretos do diploma", async function () {
      const result = await contract.getDiploma(sampleDiploma.studentId);
      expect(result.studentName).to.equal(sampleDiploma.studentName);
      expect(result.studentId).to.equal(sampleDiploma.studentId);
      expect(result.course).to.equal(sampleDiploma.course);
      expect(result.completionDate).to.equal(sampleDiploma.completionDate);
      expect(result.pdfHash).to.equal(sampleDiploma.pdfHash);
      expect(result.isValid).to.equal(true);
    });

    it("Deve confirmar diploma como válido", async function () {
      expect(await contract.isDiplomaValid(sampleDiploma.studentId)).to.equal(true);
    });

    it("Deve encontrar aluno pelo hash do PDF", async function () {
      const studentId = await contract.getStudentIdByHash(sampleDiploma.pdfHash);
      expect(studentId).to.equal(sampleDiploma.studentId);
    });

    it("Deve retornar false para ID inexistente", async function () {
      expect(await contract.isDiplomaValid("000.000.000-00")).to.equal(false);
    });

    it("Deve lançar erro ao buscar ID inexistente com getDiploma", async function () {
      await expect(contract.getDiploma("000.000.000-00")).to.be.revertedWith(
        "Diploma nao encontrado para este identificador"
      );
    });

    it("Qualquer usuário deve conseguir consultar um diploma", async function () {
      const result = await contract.connect(user1).getDiploma(sampleDiploma.studentId);
      expect(result.studentName).to.equal(sampleDiploma.studentName);
    });
  });

  // ─── Revogação e Reativação ────────────────────────────────────────────
  describe("Revogação e Reativação", function () {
    beforeEach(async function () {
      await contract.registerDiploma(
        sampleDiploma.studentName,
        sampleDiploma.studentId,
        sampleDiploma.course,
        sampleDiploma.completionDate,
        sampleDiploma.pdfHash
      );
    });

    it("Owner deve conseguir revogar um diploma", async function () {
      await contract.revokeDiploma(sampleDiploma.studentId);
      expect(await contract.isDiplomaValid(sampleDiploma.studentId)).to.equal(false);
    });

    it("Deve emitir evento DiplomaRevoked", async function () {
      await expect(contract.revokeDiploma(sampleDiploma.studentId))
        .to.emit(contract, "DiplomaRevoked")
        .withArgs(sampleDiploma.studentId, (ts) => ts > 0n);
    });

    it("Não-owner não deve conseguir revogar", async function () {
      await expect(
        contract.connect(user1).revokeDiploma(sampleDiploma.studentId)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("Owner deve conseguir reativar um diploma revogado", async function () {
      await contract.revokeDiploma(sampleDiploma.studentId);
      await contract.reactivateDiploma(sampleDiploma.studentId);
      expect(await contract.isDiplomaValid(sampleDiploma.studentId)).to.equal(true);
    });

    it("Deve emitir evento DiplomaReactivated", async function () {
      await contract.revokeDiploma(sampleDiploma.studentId);
      await expect(contract.reactivateDiploma(sampleDiploma.studentId))
        .to.emit(contract, "DiplomaReactivated")
        .withArgs(sampleDiploma.studentId, (ts) => ts > 0n);
    });
  });
});
