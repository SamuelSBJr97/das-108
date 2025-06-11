document.addEventListener("DOMContentLoaded", function () {
    const tableHead = document.getElementById('tableHead');
    const tableFilters = document.getElementById('tableFilters');
    const tableBody = document.querySelector('#veiculosTable tbody');
    const pagination = document.getElementById('pagination');
    const globalSearch = document.getElementById('searchInputGlobal');

    let dados = [];
    let currentPage = 1;
    const rowsPerPage = 25;
    let currentSort = { column: null, asc: true };
    let filtrosPorColuna = {};

    fetch('/dados/perfil-placa.json')
        .then(res => res.json())
        .then(json => {
            dados = json.perfilPlaca;
            gerarCabecalhos(dados[0], json.perfilEmpresa);
            renderTabela();
        });

    function gerarCabecalhos(item, perfis) {
        const fixos = ['VeiculoId', 'Placa', 'Serie'];
        const dinamicos = perfis.map(p => 'perfil_' + p.EmpresaPerfilId);

        const colunas = [...fixos, ...dinamicos];

        tableHead.innerHTML = ['<th><input type="checkbox" disabled></th>', ...colunas.map(col => 
            `<th data-sort="${col}" style="cursor:pointer">${col}</th>`)
        ].join('');

        tableFilters.innerHTML = ['<th></th>', ...colunas.map(col =>
            `<th><input class="form-control form-control-sm" data-filter="${col}" placeholder="Filtrar ${col}"></th>`)
        ].join('');

        tableHead.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                currentSort = (currentSort.column === col)
                    ? { column: col, asc: !currentSort.asc }
                    : { column: col, asc: true };
                renderTabela();
            });
        });

        tableFilters.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                const col = input.dataset.filter;
                filtrosPorColuna[col] = input.value.toLowerCase();
                currentPage = 1;
                renderTabela();
            });
        });

        globalSearch.addEventListener('input', () => {
            currentPage = 1;
            renderTabela();
        });
    }

    function aplicarFiltros(dado) {
        const globalTerm = globalSearch.value.toLowerCase();
        const passaGlobal = !globalTerm || Object.values(dado).some(val =>
            String(val).toLowerCase().includes(globalTerm));
        const passaColunas = Object.entries(filtrosPorColuna).every(([col, termo]) =>
            String(dado[col] ?? '').toLowerCase().includes(termo));
        return passaGlobal && passaColunas;
    }

    function renderTabela() {
        let filtrados = dados.filter(aplicarFiltros);

        if (currentSort.column) {
            filtrados.sort((a, b) => {
                const valA = a[currentSort.column];
                const valB = b[currentSort.column];
                return (valA > valB ? 1 : valA < valB ? -1 : 0) * (currentSort.asc ? 1 : -1);
            });
        }

        const totalPages = Math.ceil(filtrados.length / rowsPerPage);
        const inicio = (currentPage - 1) * rowsPerPage;
        const pageItems = filtrados.slice(inicio, inicio + rowsPerPage);

        tableBody.innerHTML = pageItems.map(item => {
            const checkbox = `<td><input type="checkbox" class="form-check-input" data-veiculo="${item.VeiculoId}"></td>`;
            const tds = Object.keys(item)
                .filter(k => k !== 'OriginalState')
                .map(col => `<td>${typeof item[col] === 'boolean' ? (item[col] ? '✅' : '❌') : item[col]}</td>`)
                .join('');
            return `<tr>${checkbox}${tds}</tr>`;
        }).join('');

        renderPaginacao(totalPages);
    }

    function renderPaginacao(totalPages) {
        pagination.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item \${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            li.addEventListener('click', e => {
                e.preventDefault();
                currentPage = i;
                renderTabela();
            });
            pagination.appendChild(li);
        }
    }
});
