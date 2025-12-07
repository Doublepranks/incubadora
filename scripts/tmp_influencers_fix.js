const fs = require("fs");
const path = require("path");
const file = path.join("frontend","src","pages","Influencers.jsx");
let text = fs.readFileSync(file, "utf8");
const start = text.indexOf("      {loading ? (");
const end = text.indexOf("      {modalOpen && (");
if (start === -1 || end === -1) {
  console.error("anchors not found", start, end);
  process.exit(1);
}
const block = `      {loading ? (
        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Carregando...
        </div>
      ) : error ? (
        <div className="p-4 rounded-md bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      ) : (
        <div className="bg-gray-950 text-gray-100 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
          {status && (
            <div className="px-4 py-3 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border-b border-green-200 dark:border-green-800">
              {status}
            </div>
          )}
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs uppercase bg-gray-900/80 text-gray-500">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">UF</th>
                <th className="px-6 py-3">Município</th>
                <th className="px-6 py-3">Plataformas</th>
                <th className="px-6 py-3">Seguidores</th>
                <th className="px-6 py-3">Posts</th>
                <th className="px-6 py-3">Crescimento</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {influencers.map((inf) => (
                <tr key={inf.id} className="border-b border-gray-800/60 bg-gray-900/60 hover:bg-gray-900 transition-colors">
                  <td className="px-6 py-4 text-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-800 overflow-hidden flex items-center justify-center text-gray-400">
                        {inf.avatarUrl ? (
                          <img src={inf.avatarUrl} alt={inf.name} className="h-full w-full object-cover" />
                        ) : (
                          <Users size={18} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-50">{inf.name}</div>
                        <div className="text-xs text-gray-400">{inf.city || "-"} - {inf.state}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-200">{inf.state}</td>
                  <td className="px-6 py-4 text-gray-200">{inf.city || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {inf.platforms?.map((p) => (
                        <span
                          key={p}
                          className={\`px-2 py-1 text-xs rounded-full font-semibold \${platformBadgeClasses[p] || "bg-gray-700 text-gray-200 border border-gray-600"}\`}
                        >
                          {p === "x" ? "X" : p.charAt(0).toUpperCase() + p.slice(1)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-100 font-semibold">{formatNumber(inf.totalFollowers)}</td>
                  <td className="px-6 py-4 text-gray-100">{formatNumber(inf.totalPosts)}</td>
                  <td className="px-6 py-4">
                    <span className={\`font-semibold \${inf.growthPercent >= 0 ? "text-emerald-400" : "text-red-400"}\`}>
                      {inf.growthPercent ? \`${inf.growthPercent.toFixed(1)}%\` : "0%"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      <button
                        onClick={() => openEdit(inf)}
                        className="px-3 py-1 text-xs rounded-md border border-blue-500/60 text-blue-100 bg-blue-500/10 hover:bg-blue-500/20"
                        title="Editar"
                      >
                        <div className="flex items-center gap-1"><Edit2 size={14} /> Editar</div>
                      </button>
                      <button
                        onClick={() => openNote(inf)}
                        className="px-3 py-1 text-xs rounded-md border border-gray-500/60 text-gray-100 bg-gray-500/10 hover:bg-gray-500/20"
                        title="Notas"
                      >
                        <div className="flex items-center gap-1"><FileText size={14} /> Nota</div>
                      </button>
                      <button
                        onClick={() => openMetric(inf)}
                        className="px-3 py-1 text-xs rounded-md border border-amber-500/70 text-amber-100 bg-amber-500/10 hover:bg-amber-500/20"
                        title="Adicionar métrica manual"
                      >
                        <div className="flex items-center gap-1"><Activity size={14} /> Métrica</div>
                      </button>
                      <button
                        onClick={() => navigate(`\`/influencer/\${inf.id}\``)}
                        className="px-3 py-1 text-xs rounded-md border border-indigo-500/70 text-indigo-100 bg-indigo-500/10 hover:bg-indigo-500/20"
                      >
                        Detalhe
                      </button>
                      <button
                        onClick={() => handleDelete(inf.id)}
                        className="px-3 py-1 text-xs rounded-md border border-red-500/70 text-red-100 bg-red-500/10 hover:bg-red-500/20"
                        title="Remover"
                      >
                        <div className="flex items-center gap-1"><Trash2 size={14} /> Remover</div>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {influencers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-6 text-center text-gray-500">
                    Nenhum influenciador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )
`;
const newText = text.slice(0, start) + block + text.slice(end);
fs.writeFileSync(file, newText, "utf8");

