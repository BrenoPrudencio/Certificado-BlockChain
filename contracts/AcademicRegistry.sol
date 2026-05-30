// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AcademicRegistry
 * @author Registro Acadêmico Blockchain
 * @notice Contrato para emissão e validação pública de diplomas e certificados acadêmicos.
 *         Apenas o administrador (owner) pode registrar novos diplomas.
 *         Qualquer usuário pode consultar e verificar diplomas publicamente.
 */
contract AcademicRegistry is Ownable {

    // ─────────────────────────────────────────────
    //  Estruturas de Dados
    // ─────────────────────────────────────────────

    /**
     * @notice Estrutura que representa um diploma acadêmico registrado na blockchain.
     * @param studentName     Nome completo do aluno.
     * @param studentId       CPF ou identificador único do aluno.
     * @param course          Nome do curso concluído.
     * @param completionDate  Data de conclusão do curso (formato: DD/MM/AAAA).
     * @param pdfHash         Hash SHA-256 do arquivo PDF do diploma.
     * @param registeredAt    Timestamp Unix do momento do registro na blockchain.
     * @param isValid         Indica se o diploma é válido (true) ou foi revogado (false).
     */
    struct Diploma {
        string studentName;
        string studentId;
        string course;
        string completionDate;
        string pdfHash;
        uint256 registeredAt;
        bool isValid;
    }

    // ─────────────────────────────────────────────
    //  Variáveis de Estado
    // ─────────────────────────────────────────────

    /// @notice Mapeamento de identificador do aluno para seus dados de diploma.
    mapping(string => Diploma) private diplomas;

    /// @notice Controla se um diploma já foi registrado para um dado identificador.
    mapping(string => bool) private diplomaExists;

    /// @notice Mapeamento de hash SHA-256 para o identificador do aluno (busca por hash).
    mapping(string => string) private hashToStudentId;

    /// @notice Contador total de diplomas registrados.
    uint256 public totalDiplomas;

    // ─────────────────────────────────────────────
    //  Eventos
    // ─────────────────────────────────────────────

    /**
     * @notice Emitido sempre que um novo diploma é registrado com sucesso.
     * @param studentId      Identificador único do aluno (indexado para facilitar buscas).
     * @param studentName    Nome do aluno.
     * @param course         Curso concluído.
     * @param completionDate Data de conclusão.
     * @param pdfHash        Hash SHA-256 do PDF do diploma.
     * @param timestamp      Momento do registro.
     */
    event DiplomaRegistered(
        string indexed studentId,
        string studentName,
        string course,
        string completionDate,
        string pdfHash,
        uint256 timestamp
    );

    /**
     * @notice Emitido quando um diploma é revogado pelo administrador.
     * @param studentId Identificador único do aluno.
     * @param timestamp Momento da revogação.
     */
    event DiplomaRevoked(
        string indexed studentId,
        uint256 timestamp
    );

    /**
     * @notice Emitido quando um diploma revogado é reativado pelo administrador.
     * @param studentId Identificador único do aluno.
     * @param timestamp Momento da reativação.
     */
    event DiplomaReactivated(
        string indexed studentId,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    /**
     * @notice Inicializa o contrato definindo o deployer como owner (administrador).
     */
    constructor() Ownable(msg.sender) {}

    // ─────────────────────────────────────────────
    //  Funções de Escrita (somente owner)
    // ─────────────────────────────────────────────

    /**
     * @notice Registra um novo diploma acadêmico na blockchain.
     * @dev Apenas o owner (instituição de ensino) pode chamar esta função.
     *      Cada identificador de aluno só pode ter um diploma registrado.
     * @param _studentName    Nome completo do aluno.
     * @param _studentId      CPF ou identificador único (ex: "123.456.789-00").
     * @param _course         Nome do curso concluído.
     * @param _completionDate Data de conclusão no formato "DD/MM/AAAA".
     * @param _pdfHash        Hash SHA-256 (hex, 64 caracteres) do arquivo PDF do diploma.
     */
    function registerDiploma(
        string memory _studentName,
        string memory _studentId,
        string memory _course,
        string memory _completionDate,
        string memory _pdfHash
    ) external onlyOwner {
        require(bytes(_studentName).length > 0,     "Nome do aluno e obrigatorio");
        require(bytes(_studentId).length > 0,       "Identificador do aluno e obrigatorio");
        require(bytes(_course).length > 0,          "Nome do curso e obrigatorio");
        require(bytes(_completionDate).length > 0,  "Data de conclusao e obrigatoria");
        require(bytes(_pdfHash).length == 64,       "Hash SHA-256 invalido (deve ter 64 caracteres hex)");
        require(!diplomaExists[_studentId],          "Diploma ja registrado para este identificador");
        require(bytes(hashToStudentId[_pdfHash]).length == 0, "Este hash de PDF ja foi registrado");

        diplomas[_studentId] = Diploma({
            studentName:     _studentName,
            studentId:       _studentId,
            course:          _course,
            completionDate:  _completionDate,
            pdfHash:         _pdfHash,
            registeredAt:    block.timestamp,
            isValid:         true
        });

        diplomaExists[_studentId]  = true;
        hashToStudentId[_pdfHash]  = _studentId;
        totalDiplomas++;

        emit DiplomaRegistered(
            _studentId,
            _studentName,
            _course,
            _completionDate,
            _pdfHash,
            block.timestamp
        );
    }

    /**
     * @notice Revoga um diploma, marcando-o como inválido.
     * @dev Apenas o owner pode revogar diplomas. O diploma continua armazenado para auditoria.
     * @param _studentId Identificador único do aluno cujo diploma será revogado.
     */
    function revokeDiploma(string memory _studentId) external onlyOwner {
        require(diplomaExists[_studentId],       "Diploma nao encontrado");
        require(diplomas[_studentId].isValid,    "Diploma ja esta revogado");

        diplomas[_studentId].isValid = false;

        emit DiplomaRevoked(_studentId, block.timestamp);
    }

    /**
     * @notice Reativa um diploma previamente revogado.
     * @dev Apenas o owner pode reativar diplomas.
     * @param _studentId Identificador único do aluno cujo diploma será reativado.
     */
    function reactivateDiploma(string memory _studentId) external onlyOwner {
        require(diplomaExists[_studentId],       "Diploma nao encontrado");
        require(!diplomas[_studentId].isValid,   "Diploma ja esta ativo");

        diplomas[_studentId].isValid = true;

        emit DiplomaReactivated(_studentId, block.timestamp);
    }

    // ─────────────────────────────────────────────
    //  Funções de Leitura (públicas)
    // ─────────────────────────────────────────────

    /**
     * @notice Retorna todos os dados de um diploma a partir do identificador do aluno.
     * @param _studentId CPF ou identificador único do aluno.
     * @return studentName    Nome do aluno.
     * @return studentId      Identificador do aluno.
     * @return course         Curso concluído.
     * @return completionDate Data de conclusão.
     * @return pdfHash        Hash SHA-256 do PDF.
     * @return registeredAt   Timestamp do registro.
     * @return isValid        Status de validade do diploma.
     */
    function getDiploma(string memory _studentId)
        external
        view
        returns (
            string memory studentName,
            string memory studentId,
            string memory course,
            string memory completionDate,
            string memory pdfHash,
            uint256 registeredAt,
            bool isValid
        )
    {
        require(diplomaExists[_studentId], "Diploma nao encontrado para este identificador");

        Diploma memory d = diplomas[_studentId];
        return (
            d.studentName,
            d.studentId,
            d.course,
            d.completionDate,
            d.pdfHash,
            d.registeredAt,
            d.isValid
        );
    }

    /**
     * @notice Verifica de forma rápida se um diploma é válido.
     * @param _studentId Identificador único do aluno.
     * @return true se o diploma existir e estiver válido, false caso contrário.
     */
    function isDiplomaValid(string memory _studentId) external view returns (bool) {
        return diplomaExists[_studentId] && diplomas[_studentId].isValid;
    }

    /**
     * @notice Busca o identificador do aluno a partir do hash SHA-256 do PDF.
     * @dev Útil para verificar se um arquivo PDF específico corresponde a um diploma registrado.
     * @param _pdfHash Hash SHA-256 (hex, 64 caracteres) do PDF.
     * @return studentId O identificador do aluno vinculado a este hash, ou string vazia se não encontrado.
     */
    function getStudentIdByHash(string memory _pdfHash)
        external
        view
        returns (string memory studentId)
    {
        return hashToStudentId[_pdfHash];
    }

    /**
     * @notice Verifica se um diploma já foi registrado para um dado identificador.
     * @param _studentId Identificador único do aluno.
     * @return true se existir registro, false caso contrário.
     */
    function diplomaRegistered(string memory _studentId) external view returns (bool) {
        return diplomaExists[_studentId];
    }
}
