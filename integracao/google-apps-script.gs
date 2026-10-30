/**
 * Salva cada pré-matrícula do site numa planilha do Google.
 *
 * 1. Crie uma planilha no Google Sheets.
 * 2. Extensões → Apps Script → cole este código e salve.
 * 3. Implantar → Nova implantação → Tipo "App da Web"
 *      Executar como: Eu  |  Quem pode acessar: Qualquer pessoa
 * 4. Copie a URL gerada e cole em assets/js/config.js → endpointMatricula.
 */
const COLUNAS = [
  'protocolo', 'dataHora', 'cursoNome', 'turno', 'nome', 'nascimento', 'serie', 'escola', 'cpf',
  'whatsapp', 'email', 'bairro', 'menor', 'respNome', 'respWhatsapp', 'origem', 'obs'
];

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) sheet.appendRow(COLUNAS);
  const d = JSON.parse(e.postData.contents);
  sheet.appendRow(COLUNAS.map(c => (d[c] === undefined ? '' : d[c])));
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
