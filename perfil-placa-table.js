$(document).ready(function () {
    let alteracoes = {};
    let perfis = {};
    let dataTable = null;

    // Carrega os perfis disponíveis
    $.getJSON('perfil-placa.json', function (data) {
        perfis = {};
        if (data.perfilEmpresa) {
            data.perfilEmpresa.forEach(function (p) {
                perfis[p.EmpresaPerfilId] = p.PerfilDescricao;
            });
            // Preenche filtro de perfil
            var $filtroPerfil = $('#filtroPerfil');
            var $perfilMassa = $('#perfilMassa');
            for (var pid in perfis) {
                if (perfis.hasOwnProperty(pid)) {
                    $filtroPerfil.append('<option value="' + pid + '">' + perfis[pid] + '</option>');
                    $perfilMassa.append('<option value="' + pid + '">' + perfis[pid] + '</option>');
                }
            }
        }
        carregarTabela(data.perfilPlaca);
    });

    function carregarTabela(perfilPlaca) {
        // Descobre colunas dinâmicas de perfil
        let colunasPerfil = [];
        if (perfilPlaca.length > 0) {
            Object.keys(perfilPlaca[0]).forEach(function (key) {
                if (/^perfil_\d+$/.test(key)) {
                    colunasPerfil.push(key);
                }
            });
        }
        // Colunas fixas
        let columns = [
            { data: 'VeiculoId' },
            { data: 'Placa' },
            { data: 'Serie' },
            {
                data: null,
                title: 'Perfil',
                render: function (data, type, row) {
                    let perfilSelecionado = null;
                    for (let i = 0; i < colunasPerfil.length; i++) {
                        if (row[colunasPerfil[i]]) {
                            perfilSelecionado = colunasPerfil[i].split('_')[1];
                            break;
                        }
                    }
                    let select = `<select class='perfil-select form-select form-select-sm' data-id='${row.VeiculoId}'>`;
                    select += `<option value=''></option>`;
                    for (let pid in perfis) {
                        if (perfis.hasOwnProperty(pid)) {
                            let selected = (pid == perfilSelecionado) ? 'selected' : '';
                            select += `<option value='${pid}' ${selected}>${perfis[pid]}</option>`;
                        }
                    }
                    select += '</select>';
                    if (type === 'filter') return perfilSelecionado || '';
                    return select;
                }
            }
        ];
        if (dataTable) {
            dataTable.clear().rows.add(perfilPlaca).draw();
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
        const lista = Object.keys(alteracoes).map(veiculoId => ({
            VeiculoId: parseInt(veiculoId),
            Alteracoes: alteracoes[veiculoId]
        }));
        if (lista.length === 0) {
            alert('Nenhuma alteração para salvar.');
            return;
        }
        let msg = 'As seguintes linhas serão atualizadas:\n';
        lista.forEach(item => {
            msg += `VeiculoId: ${item.VeiculoId}, Perfis: `;
            let perfisMarcados = [];
            for (let k in item.Alteracoes) {
                if (item.Alteracoes[k]) perfisMarcados.push(k);
            }
            msg += perfisMarcados.join(', ') + '\n';
        });
        msg += '\nDeseja realmente atualizar?';
        if (confirm(msg)) {
            enviarAlteracoesEmLote(lista);
            alteracoes = {};
        }
    });

    function enviarAlteracao(veiculoId, alteracao) {
        // Simula atualização do arquivo perfil-up-placa.json
        $.getJSON('perfil-up-placa.json', function (data) {
            if (!data.alteracoes) data.alteracoes = [];
            data.alteracoes = data.alteracoes.filter(a => a.VeiculoId !== veiculoId);
            data.alteracoes.push({ VeiculoId: veiculoId, Alteracoes: alteracao });
            salvarAlteracoes(data);
        });
    }

    function enviarAlteracoesEmLote(lista) {
        $.getJSON('perfil-up-placa.json', function (data) {
            if (!data.alteracoes) data.alteracoes = [];
            // Remove veículos já existentes
            lista.forEach(item => {
                data.alteracoes = data.alteracoes.filter(a => a.VeiculoId !== item.VeiculoId);
                data.alteracoes.push(item);
            });
            salvarAlteracoes(data);
        });
    }

    function salvarAlteracoes(data) {
        // Simulação: exibe no console. Troque por chamada AJAX real para backend.
        console.log('Salvar no perfil-up-placa.json:', JSON.stringify(data, null, 2));
        alert('Alterações salvas (simulado, veja console).');
    }

    // Filtro por perfil
    $('#filtroPerfil').on('change', function () {
        const perfil = $(this).val();
        const table = getDataTable();
        if (perfil) {
            table.column(3).search('^' + perfil + '$', true, false).draw();
        } else {
            table.column(3).search('').draw();
        }
    });

    // Filtro por texto (placa)
    $('#filtroTexto').on('keyup change', function () {
        const texto = $(this).val();
        const table = getDataTable();
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

    // Função utilitária para obter a instância do DataTable
    function getDataTable() {
        return dataTable || $('#perfilPlacaTable').DataTable();
    }
});
