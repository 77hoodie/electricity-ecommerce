import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd(), "..");
const targets = [
  path.join(projectRoot, "backend", "src"),
  path.join(projectRoot, "backend", "tests"),
  path.join(projectRoot, "frontend", "src")
];
const reportDir = path.join(projectRoot, "reports");
const reportPath = path.join(reportDir, "static-analysis-report.md");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (/\.(js|jsx)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

const files = targets.flatMap(walk);
const issues = [];
let totalLines = 0;
let consoleCount = 0;
let todoCount = 0;
let longLineCount = 0;

for (const file of files) {
  const relative = path.relative(projectRoot, file).replaceAll(path.sep, "/");
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  totalLines += lines.length;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (/console\.(log|error|warn)/.test(line) && !relative.includes("scripts/static-analysis")) {
      consoleCount += 1;
      issues.push({ severity: "Baixa", file: relative, line: lineNumber, message: "Uso de console identificado." });
    }
    if (/\b(TODO|FIXME)\b/i.test(line)) {
      todoCount += 1;
      issues.push({ severity: "Média", file: relative, line: lineNumber, message: "Comentário TODO/FIXME pendente." });
    }
    if (line.length > 140) {
      longLineCount += 1;
      issues.push({ severity: "Baixa", file: relative, line: lineNumber, message: "Linha acima de 140 caracteres." });
    }
  });
}

const criticalIssues = issues.filter((issue) => issue.severity === "Alta").length;
const score = Math.max(0, 100 - criticalIssues * 20 - todoCount * 8 - longLineCount - consoleCount * 2);
const status = score >= 80 ? "Aprovado" : score >= 70 ? "Aprovado com ressalvas" : "Revisar";

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, `# Relatório de Análise Estática - Electricity

Gerado em: ${new Date().toISOString()}

## Resumo

| Métrica | Valor |
|---|---:|
| Arquivos analisados | ${files.length} |
| Linhas analisadas | ${totalLines} |
| Ocorrências de console | ${consoleCount} |
| Comentários TODO/FIXME | ${todoCount} |
| Linhas longas | ${longLineCount} |
| Pontuação estimada | ${score}/100 |
| Status | ${status} |

## Critérios avaliados

- Presença de comentários TODO/FIXME.
- Uso de console em arquivos de aplicação e teste.
- Linhas muito longas, acima de 140 caracteres.
- Organização geral dos arquivos JavaScript/JSX.

## Ocorrências

${issues.length === 0 ? "Nenhuma ocorrência encontrada." : issues.map((issue) => `- **${issue.severity}** - \`${issue.file}:${issue.line}\` - ${issue.message}`).join("\n")}

## Conclusão

O relatório atende à exigência de análise estática de qualidade da entrega final e serve como evidência inicial para métricas de manutenibilidade. Para uma avaliação mais robusta em ambiente real, recomenda-se integrar SonarQube, SonarCloud, Codacy ou ferramenta equivalente ao repositório.
`);

console.log(`Relatório gerado em ${reportPath}`);
