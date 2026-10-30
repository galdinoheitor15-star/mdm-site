# Site — Melhores do Mundo Cursos (MDM)

Site estático (HTML + CSS + JS), sem build. Abra com qualquer servidor local:

```bash
python -m http.server 5517 --directory C:/Users/galdi/Documents/mdm-site
```

Depois acesse http://localhost:5517. Abrir o `index.html` direto (file://) não funciona, por causa dos módulos JS.

## Onde editar
- **`assets/js/config.js`**: WhatsApp, endereço, e-mail, ano letivo, cursos (nome, texto, itens, cor), turnos e séries.
- **Fotos**: `assets/img/` (vieram do Instagram @mdmpreoficial). Troque por fotos em alta resolução quando tiver.

## Matrícula
1. O aluno escolhe curso e turno, preenche os dados (com validação de CPF, máscara de telefone e responsável obrigatório para menores) e revisa tudo.
2. Recebe um protocolo (ex.: `MDM-2027-AB12CD`) e um botão que abre o WhatsApp da secretaria com a ficha completa já escrita.
3. Pode salvar/imprimir o comprovante.

**Planilha automática (opcional):** siga as instruções em `integracao/google-apps-script.gs` e cole a URL em `endpointMatricula` no `config.js`. Assim cada matrícula também vira uma linha no Google Sheets.

## Publicar
Arraste a pasta inteira para https://app.netlify.com/drop (ou Vercel / GitHub Pages). Depois aponte o domínio `melhoresdomundocursos.com.br`.

## Confirmar com o MDM antes de publicar
- Endereço (Rua do Riachuelo, 529 – Boa Vista) e e-mail da ouvidoria: tirados de um cadastro público antigo.
- Turnos disponíveis (Manhã/Tarde/Noite) e os textos de cada curso.
- Nota 4,9 no Google, citada no hero.
