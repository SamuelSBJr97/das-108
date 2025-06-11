
document.addEventListener("DOMContentLoaded", function () {
    const tabList = document.getElementById("perfilTabs");
    const tabContent = document.getElementById("perfilTabContent");

    let dados = [];
    let perfis = [];

    fetch("/dados/perfil-placa.json")
        .then(res => res.json())
        .then(json => {
            dados = json.perfilPlaca;
            perfis = json.perfilEmpresa;
            montarAbas(perfis);
        });

    function montarAbas(perfis) {
        tabList.innerHTML = "";
        tabContent.innerHTML = "";

        perfis.forEach((perfil, index) => {
            const perfilKey = "perfil_" + perfil.EmpresaPerfilId;

            const li = document.createElement("li");
            li.className = "nav-item";
            li.role = "presentation";
            li.innerHTML = `
                <button class="nav-link ${index === 0 ? "active" : ""}" id="tab-${perfilKey}" data-bs-toggle="tab"
                    data-bs-target="#content-${perfilKey}" type="button" role="tab">${perfil.Nome}</button>
            `;
            tabList.appendChild(li);

            const tabPane = document.createElement("div");
            tabPane.className = "tab-pane fade " + (index === 0 ? "show active" : "");
            tabPane.id = "content-" + perfilKey;
            tabPane.role = "tabpanel";
            tabPane.innerHTML = `
                <div class="mb-2">
                    <input type="text" class="form-control form-control-sm mb-2" placeholder="Buscar por placa..." data-busca="${perfilKey}">
                    <div class="btn-group mb-2" role="group">
                        <button class="btn btn-outline-primary btn-sm" data-sort="${perfilKey}" data-order="placa">Placa</button>
                        <button class="btn btn-outline-success btn-sm" data-sort="${perfilKey}" data-order="selecionado">Selecionado</button>
                        <button class="btn btn-outline-secondary btn-sm" data-sort="${perfilKey}" data-order="naoSelecionado">Não Selecionado</button>
                    </div>
                    <ul class="list-group list-group-sm" id="lista-${perfilKey}"></ul>
                </div>
            `;
            tabContent.appendChild(tabPane);

            renderizarLista(perfilKey);

            tabPane.querySelector(`[data-busca="${perfilKey}"]`).addEventListener("input", () => renderizarLista(perfilKey));
            tabPane.querySelectorAll(`[data-sort="${perfilKey}"]`).forEach(btn => {
                btn.addEventListener("click", () => {
                    tabPane.setAttribute("data-order", btn.dataset.order);
                    renderizarLista(perfilKey);
                });
            });
        });
    }

    function renderizarLista(perfilKey) {
        const tabPane = document.getElementById("content-" + perfilKey);
        const lista = tabPane.querySelector("#lista-" + perfilKey);
        const filtro = tabPane.querySelector(`[data-busca="${perfilKey}"]`).value.toLowerCase();
        const order = tabPane.getAttribute("data-order") || "placa";

        let filtrados = dados.filter(v => v.Placa.toLowerCase().includes(filtro));

        if (order === "placa") {
            filtrados.sort((a, b) => a.Placa.localeCompare(b.Placa));
        } else if (order === "selecionado") {
            filtrados = filtrados.filter(v => v[perfilKey]);
        } else if (order === "naoSelecionado") {
            filtrados = filtrados.filter(v => !v[perfilKey]);
        }

        lista.innerHTML = filtrados.map(v => {
            const checked = v[perfilKey] ? "checked" : "";
            return `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${v.Placa}
                    <input type="checkbox" class="form-check-input" data-veiculo="${v.VeiculoId}" ${checked}>
                </li>
            `;
        }).join("");
    }
});
