$(document).ready(function () {
    let alteracoes = {};
    let perfis = {};
    let dataTable = null;

    // Carrega perfis, empresas e veículos do backend
    function carregarDados() {
        $.getJSON('/api/empresas', function (empresasData) {
            var $empresaSelect = $('#empresaSelect');
            $empresaSelect.empty().append('<option value="">Todas Empresas</option>');
            empresasData.forEach(function (e) {
                $empresaSelect.append('<option value="' + e.empresaId + '">' + e.nome + '</option>');
            });
            carregarPerfisVeiculos();
        });
    }

    function carregarPerfisVeiculos() {
        $.getJSON('/api/perfis', function (perfisData) {
            perfis = {};
            var $filtroPerfil = $('#filtroPerfil');
            var $perfilMassa = $('#perfilMassa');
            $filtroPerfil.empty().append('<option value="">Todos</option>');
            $perfilMassa.empty().append('<option value="">Selecione</option>');
            perfisData.forEach(function (p) {
                perfis[p.EmpresaPerfilId] = p.PerfilDescricao;
                $filtroPerfil.append('<option value="' + p.EmpresaPerfilId + '">' + p.PerfilDescricao + '</option>');
                $perfilMassa.append('<option value="' + p.EmpresaPerfilId + '">' + p.PerfilDescricao + '</option>');
            });
            $.getJSON('/api/veiculos', function (veiculosData) {
                // Adapta para consumir perfis como array de objetos {id, nome, checked}
                veiculosData = veiculosData.map(function(v) {
                    // Gera objeto perfis para renderização do select
                    let perfilObj = {};
                    let perfilSelecionado = null;
                    if (Array.isArray(v.perfis)) {
                        v.perfis.forEach(function(p) {
                            perfilObj['perfil_' + p.id] = p.checked;
                            if (p.checked) perfilSelecionado = p.id;
                        });
                    }
                    return {
                        veiculoId: v.veiculoId,
                        placa: v.placa,
                        serie: v.serie,
                        perfilId: perfilSelecionado,
                        perfis: perfilObj,
                        perfisArray: v.perfis // mantém o array original para uso no select
                    };
                });
                carregarTabela(veiculosData);
            });
        });
    }

    function carregarTabela(perfilPlaca) {
        let columns = [
            { data: 'veiculoId', title: 'VeiculoId' },
            { data: 'placa', title: 'Placa' },
            { data: 'serie', title: 'Série' },
            {
                data: 'perfisArray',
                title: 'Perfil',
                render: function (data, type, row) {
                    // Usa o array de perfis para montar o select
                    let perfilSelecionado = row.perfilId;
                    let select = `<select class='perfil-select form-select form-select-sm' data-id='${row.veiculoId}'>`;
                    select += `<option value=''></option>`;
                    if (Array.isArray(data)) {
                        data.forEach(function(p) {
                            let selected = (perfilSelecionado == p.id) ? 'selected' : '';
                            select += `<option value='${p.id}' ${selected}>${p.nome}</option>`;
                        });
                    }
                    select += '</select>';
                    if (type === 'filter') return perfilSelecionado || '';
                    return select;
                }
            }
        ];
        if (dataTable) {
            dataTable.clear();
            dataTable.rows.add(perfilPlaca);
            dataTable.draw(false);
        } else {
            dataTable = $('#perfilPlacaTable').DataTable({
                data: perfilPlaca,
                destroy: true,
                columns: columns,
                createdRow: function(row) {
                    $(row).addClass('align-middle');
                },
                deferRender: true,
                pageLength: 25,
                lengthMenu: [10, 25, 50, 100],
                language: {
                    url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json'
                },
                dom: 'Bfrtip',
                buttons: [
                    {
                        extend: 'excel',
                        text: 'Exportar Excel',
                        className: 'btn btn-success btn-sm'
                    },
                    {
                        extend: 'csv',
                        text: 'Exportar CSV',
                        className: 'btn btn-secondary btn-sm'
                    }
                ]
            });
        }
    }

    // CRUD de perfil
    function atualizarListaPerfis() {
        $.getJSON('/api/perfis', function (perfisData) {
            perfis = {};
            var $filtroPerfil = $('#filtroPerfil');
            var $perfilMassa = $('#perfilMassa');
            $filtroPerfil.empty().append('<option value="">Todos</option>');
            $perfilMassa.empty().append('<option value="">Selecione</option>');
            perfisData.forEach(function (p) {
                perfis[p.empresaPerfilId] = p.perfilDescricao;
                $filtroPerfil.append('<option value="' + p.empresaPerfilId + '">' + p.perfilDescricao + '</option>');
                $perfilMassa.append('<option value="' + p.empresaPerfilId + '">' + p.perfilDescricao + '</option>');
            });
            renderCrudPerfis(perfisData);
        });
    }

    function renderCrudPerfis(perfisData) {
        var $crud = $('#crudPerfis tbody');
        $crud.empty();
        perfisData.forEach(function (p) {
            $crud.append('<tr>' +
                '<td>' + p.empresaPerfilId + '</td>' +
                '<td><input class="form-control form-control-sm perfil-desc" data-id="' + p.empresaPerfilId + '" value="' + p.perfilDescricao + '" /></td>' +
                '<td><button class="btn btn-sm btn-primary salvar-perfil" data-id="' + p.empresaPerfilId + '">Salvar</button> ' +
                '<button class="btn btn-sm btn-danger excluir-perfil" data-id="' + p.empresaPerfilId + '">Excluir</button></td>' +
                '</tr>');
        });
    }

    // Eventos CRUD de perfil
    $('#crudPerfis').on('click', '.salvar-perfil', function () {
        var id = $(this).data('id');
        var desc = $('.perfil-desc[data-id="' + id + '"]').val();
        $.ajax({
            url: '/api/perfis/' + id,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ empresaPerfilId: id, perfilDescricao: desc }),
            success: atualizarListaPerfis
        });
    });
    $('#crudPerfis').on('click', '.excluir-perfil', function () {
        var id = $(this).data('id');
        if (confirm('Excluir perfil?')) {
            $.ajax({
                url: '/api/perfis/' + id,
                method: 'DELETE',
                success: atualizarListaPerfis
            });
        }
    });
    $('#adicionarPerfil').on('click', function () {
        var desc = $('#novoPerfilDesc').val();
        if (!desc) return alert('Descrição obrigatória');
        $.ajax({
            url: '/api/perfis',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ perfilDescricao: desc }),
            success: function () {
                $('#novoPerfilDesc').val('');
                atualizarListaPerfis();
            }
        });
    });

    // Captura alterações de select
    $('#perfilPlacaTable').on('change', 'select.perfil-select', function () {
        const $this = $(this);
        const veiculoId = $this.data('id');
        const selectedPerfil = $this.val();
        if (!alteracoes[veiculoId]) alteracoes[veiculoId] = {};
        for (let pid in perfis) {
            if (perfis.hasOwnProperty(pid)) {
                alteracoes[veiculoId][`perfil_${pid}`] = false;
            }
        }
        alteracoes[veiculoId][`perfil_${selectedPerfil}`] = true;
    });

    // Botão salvar todas alterações
    $('#salvarAlteracoes').on('click', function () {
        const lista = Object.keys(alteracoes).map(veiculoId => {
            // Descobre o perfil selecionado
            let perfilId = null;
            for (let k in alteracoes[veiculoId]) {
                if (alteracoes[veiculoId][k]) perfilId = parseInt(k.replace('perfil_', ''));
            }
            return {
                veiculoId: parseInt(veiculoId),
                perfilId: perfilId
            };
        });
        if (lista.length === 0) {
            alert('Nenhuma alteração para salvar.');
            return;
        }
        let msg = 'As seguintes linhas serão atualizadas:\n';
        lista.forEach(item => {
            msg += `VeiculoId: ${item.veiculoId}, Perfil: ${perfis[item.perfilId] || ''}\n`;
        });
        msg += '\nDeseja realmente atualizar?';
        if (confirm(msg)) {
            $.ajax({
                url: '/api/veiculos/batch',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(lista),
                success: function () {
                    alert('Alterações salvas com sucesso!');
                    alteracoes = {};
                    carregarDados();
                },
                error: function () {
                    alert('Erro ao salvar alterações.');
                }
            });
        }
    });

    // Filtro por perfil
    $('#filtroPerfil').on('change', function () {
        const perfil = $(this).val();
        const table = dataTable;
        if (perfil) {
            table.column(3).search(perfil, false, false).draw();
        } else {
            table.column(3).search('', false, false).draw();
        }
    });

    // Filtro por texto (placa)
    $('#filtroTexto').on('keyup change', function () {
        const texto = $(this).val();
        const table = dataTable;
        table.column(1).search(texto, true, false).draw();
    });

    // Selecionar perfil em massa
    $('#selecionarPerfilMassa').on('click', function () {
        const perfil = $('#perfilMassa').val();
        if (!perfil) {
            alert('Selecione um perfil para aplicar em massa.');
            return;
        }
        $('#perfilPlacaTable').find('select.perfil-select').val(perfil).trigger('change');
    });

    // Desselecionar perfil em massa
    $('#desselecionarPerfilMassa').on('click', function () {
        $('#perfilPlacaTable').find('select.perfil-select').val('').trigger('change');
    });

    // Filtro por empresa
    $('#empresaSelect').on('change', function () {
        // Aqui você pode filtrar os veículos por empresa, se o backend suportar
        // Exemplo: $.getJSON('/api/veiculos?empresaId=' + $(this).val(), ...)
        carregarPerfisVeiculos();
    });

    // Botão para carregar veículos manualmente
    $('#carregarVeiculos').on('click', function () {
        carregarPerfisVeiculos();
    });

    carregarDados();
    atualizarListaPerfis();
});
