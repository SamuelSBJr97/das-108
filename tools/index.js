'use strict'

$(function () {
    const inputCompany = document.getElementById('perfilEmpresaSelect');
    const perfisSelecionados = document.getElementById('empresaPerfisSelect');

    let table;

    function gerarTabelaPerfisPlacas() {
        limparTabelaPerfisPlacas();

        if (!perfisSelecionados.selectedOptions || perfisSelecionados.selectedOptions.length === 0) {
            return;
        }

        let params = {
            companyId: inputCompany.value,
            perfis: [...perfisSelecionados.selectedOptions].map(x => x.value),
        }

        setUIEnabled(false);

        $.ajax({
            type: 'POST',
            url: `${window.location.pathname}/BuscarEmpresaPerfilPlacas`,
            data: params,
            success: function (data) {
                if (data) {
                    const perfilEmpresa = data.perfilEmpresa;
                    const perfilPlaca = data.perfilPlaca;

                    const columns = [
                        { data: "Placa", title: "Placa" },
                        { data: "Serie", title: "Série" },
                        ...perfilEmpresa.map(perfil => ({
                            data: `perfil_${perfil.EmpresaPerfilId}`,
                            title: perfil.PerfilDescricao,
                            orderable: true,
                            createdCell: createdCell,
                            render: empresaPerfilColumn,
                            perfilId: perfil.EmpresaPerfilId,
                        }))
                    ];

                    $('#empresaPerfilPlacas thead').empty();
                    const thead = $('#empresaPerfilPlacas thead');
                    thead.append('<tr id="empresaPerfilPlacasHeader"></tr>');
                    thead.append('<tr id="empresaPerfilPlacasHeaderFilters"></tr>');

                    const headerRow = $('#empresaPerfilPlacasHeader');
                    const filterRow = $('#empresaPerfilPlacasHeaderFilters');

                    columns.forEach(col => {
                        headerRow.append(`<th>${col.title}</th>`);

                        if (col.data.startsWith('perfil_')) {
                            filterRow.append(`<th>
                                <select class="m-1 filter-select" data-column="${col.data}">
                                    <option value="">Exibir Todos</option>
                                    <option value="true">Associados</option>
                                    <option value="false">Desassociados</option>
                                </select>
                                <select data-column="${col.data}" class="m-1 action-select">
                                    <option value="">Opções de seleção</option>
                                    <option value="select-all-checkbox">Associar essas</option>                            
                                    <option value="deselect-all-checkbox">Desassociar essas</option> 
                                    <option value="invert-all-checkbox">Inverter essas associações</option>
                                </select>
                            </th>`);
                        } else {
                            filterRow.append(`<th>
                                <input type="text" class="filter-input" placeholder="Filtrar" data-column="${col.data}" />
                            </th>`);
                        }
                    });

                    // Cria DataTable
                    table = $('#empresaPerfilPlacas').DataTable({
                        data: perfilPlaca,
                        columns: columns,
                        searching: true,
                        orderCellsTop: true,
                        fixedHeader: false,
                        paging: true,
                        lengthMenu: [
                            [10, 100, 1000, -1],  // Valores internos (-1 significa "Todos")
                            [10, 100, 1000, 'Todos'] // Labels exibidos no select
                        ],
                        pageLength: 10, // Valor inicial
                        order: [[1, 'asc']],
                        language: pt_br,
                    });

                    $('#empresaPerfilPlacas thead th').on('keyup change', '.filter-input', empresaPerfilFilterInput);

                    $('#empresaPerfilPlacas thead th')
                        .on('change', '.filter-select', empresaPerfilFilterSelect);

                    // Event delegation robusta (funciona no Edge, Chrome, Firefox, etc.)
                    $('#empresaPerfilPlacas thead th').on('change', '.action-select', perfilEmpresaOpcoesSelecao);
                }

            },
            error: function (profilesErr) {
                if (profilesErr && profilesErr.responseJSON) {
                    toastr['error'](profilesErr.responseJSON.message, profilesErr.responseJSON.title);
                }
            },
            complete: function () {
                atualizarEstadoBotoes();
                setUIEnabled(true);
            }
        });
    }

    const $empresaPerfilPlacasTbody = $('#empresaPerfilPlacas tbody');

    function empresaPerfilColumn(data, type, row, meta) {
        const perfilId = meta?.settings?.aoColumns[meta.col]?.perfilId;
        const veiculoId = row.VeiculoId;

        if (type === 'display') {
            const checked = data ? 'checked' : '';

            return `<div class="form-check d-flex justify-content-center align-items-center">
                                <input type="checkbox"
                                    data-veiculoid="${veiculoId}"
                                    data-perfilid="${perfilId}"
                                    ${checked} class="associado-checkbox"/></div>`;
        }

        if (type === 'sort' || type === 'type') {
            return data ? 1 : 0;
        }


        return data ? 'true' : 'false';
    }

    function createdCell(td, cellData, rowData, row, col) {
        $(td).addClass('text-center');
    }

    function perfilEmpresaOpcoesSelecao() {
        setUIEnabled(false);

        const $this = $(this);
        const action = $this.val();

        if (!action) {
            setUIEnabled(true);
            return;
        }

        const colIndex = $this.closest('th').index();
        const column = table.column(colIndex);
        const colDataSrc = column.dataSrc(); // e.g., 'perfil_123'

        // table.rows({ search: 'applied' }) é o seu 'visibleRows'
        table.rows({ search: 'applied' }).every(function () {
            const rowData = this.data();
            const trNode = $(this.node()); // Garante que trNode é um objeto jQuery

            let newTargetState;
            switch (action) {
                case 'select-all-checkbox': newTargetState = true; break;
                case 'deselect-all-checkbox': newTargetState = false; break;
                case 'invert-all-checkbox': newTargetState = !rowData[colDataSrc]; break;
                default: return; // Ação inválida, não deveria acontecer
            }

            if (rowData[colDataSrc] !== newTargetState) {
                // Itera sobre todas as chaves relacionadas a perfis em rowData
                Object.keys(rowData).forEach(key => {
                    if (key.startsWith('perfil_')) {
                        const isTargetColumn = (key === colDataSrc);
                        const finalStateForCell = isTargetColumn ? newTargetState : false;

                        // Atualiza os dados no DataTable
                        rowData[key] = finalStateForCell;

                        // Atualiza o DOM do checkbox
                        const perfilId = key.substring('perfil_'.length);
                        const checkbox = trNode.find(`input[data-perfilid="${perfilId}"]`);
                        if (checkbox.length) {
                            checkbox.prop('checked', finalStateForCell);
                        }
                    }
                });

                // Invalida a linha para garantir atualização visual correta
                this.invalidate();
            }
        });

        $this.val('');

        setUIEnabled(true);
    }

    function empresaPerfilFilterInput() {
        const colIndex = $(this).closest('th').index();
        table.column(colIndex).search(this.value).draw();
    }

    function empresaPerfilFilterSelect() {
        const colIndex = $(this).closest('th').index();
        const val = $(this).val();

        table.column(colIndex).search(val).draw();
    }

    function inputAssociadoCheckbox() {
        setUIEnabled(false);

        const $this = $(this);
        const checkbox = $this.is('input') ? $this : $this.find('input');

        // Alterna o estado do checkbox
        const isChecked = checkbox.prop('checked');

        // Extrai os dados do checkbox
        const veiculoId = checkbox.data('veiculoid');
        const perfilId = checkbox.data('perfilid');
        const colData = `perfil_${perfilId}`;

        // Encontra a linha correspondente no DataTable
        const rowIdx = table.rows().indexes().toArray().find(idx => {
            const row = table.row(idx).data();
            return row && row.VeiculoId == veiculoId;
        });

        if (rowIdx !== undefined) {
            const rowData = table.row(rowIdx).data();
            rowData[colData] = isChecked;

            Object.keys(rowData).forEach(key => {
                if (key.startsWith('perfil_')) {
                    if (key != colData) {
                        rowData[key] = false;

                        const idPerfil = key.substring('perfil_'.length);
                        const checkbox = $this.closest('tr').find(`input[data-perfilid="${idPerfil}"]`);
                        if (checkbox.length) {
                            checkbox.prop('checked', false);
                        }
                    }
                }
            });

            // Invalida a linha para garantir atualização visual correta
            table.row(rowIdx).invalidate();
        }

        setUIEnabled(true);
    }

    $empresaPerfilPlacasTbody.on('change', '.associado-checkbox', inputAssociadoCheckbox);

    $empresaPerfilPlacasTbody.on('click', 'td:has(.associado-checkbox)', function (e) {
        // Evita que o clique no input dispare 2x o evento
        if ($(e.target).is('input')) return;

        const $checkbox = $(this).find('.associado-checkbox');
        $checkbox.prop('checked', !$checkbox.prop('checked')).trigger('change');
    });

    function atualizarEstadoBotoes() {
        const empresaSelecionada = $('#perfilEmpresaSelect').val();
        const temEmpresaSelecionada = empresaSelecionada && empresaSelecionada.length > 0;

        const perfisSelecionados = $('#empresaPerfisSelect').val();
        const temPerfisSelecionados = perfisSelecionados && perfisSelecionados.length > 0;

        const tabelaCarregada = $.fn.DataTable.isDataTable('#empresaPerfilPlacas') &&
            $('#empresaPerfilPlacas').DataTable().data().count() > 0;

        // Habilita/Desabilita seleção de perfis
        $('#empresaPerfisSelect').prop('disabled', !temEmpresaSelecionada);

        // Habilita "Carregar Placas" se houver perfis selecionados
        $('.perfilEmpresaCarregarPlacas').prop('disabled', !temPerfisSelecionados);

        // Habilita "Salvar Placas nos Perfis" se houver tabela carregada
        $('.perfilEmpresaSalvarPlacas').prop('disabled', !tabelaCarregada);

        // Controles adicionais: salvar, novo, editar, excluir, cancelar
        const botoes = ['#btnEmpresaPerfilNovo', '#btnEmpresaPerfilEditar', '#btnEmpresaPerfilExcluir'];

        botoes.forEach(selector => {
            $(selector).prop('disabled', !temEmpresaSelecionada);
        });
    }

    $('#empresaPerfisSelect').on('change', atualizarEstadoBotoes);
    $('#perfilEmpresaSelect').on('change', atualizarEstadoBotoes);

    function coletarAlteracoes() {
        const alterados = [];

        const rows = table.rows().data().toArray();

        rows.forEach(row => {
            const alteracoes = {};
            const original = row.OriginalState;

            for (const key in original) {
                if (original.hasOwnProperty(key)) {
                    const estadoAtual = row[key];
                    const estadoOriginal = original[key];

                    if (estadoAtual !== estadoOriginal) {
                        alteracoes[key] = estadoAtual;
                    }
                }
            }

            if (Object.keys(alteracoes).length > 0) {
                alterados.push({
                    VeiculoId: row.VeiculoId,
                    Alteracoes: alteracoes
                });
            }
        });

        return alterados;
    }

    function enviarAlteracoes() {
        const dadosParaSalvar = coletarAlteracoes();

        if (dadosParaSalvar.length === 0) {
            toastr.info('Nenhuma alteração detectada.');
            return;
        }

        Swal.fire({
            title: 'Confirmação',
            text: `Deseja realmente salvar as alterações?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, salvar.',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                setUIEnabled(false);
                enviarLotesComProgresso(dadosParaSalvar, 100); // Lotes de 100
            }
        });
    }

    function enviarLotesComProgresso(dados, tamanhoLote) {
        const totalLotes = Math.ceil(dados.length / tamanhoLote);
        let loteAtual = 0;
        let hasErro = false;

        Swal.fire({
            title: 'Salvando alterações...',
            html: `
        <div id="progress-container" style="width: 100%; background-color: #eee; border-radius: 5px;">
            <div id="progress-bar" style="width: 0%; height: 20px; background-color: #3085d6; border-radius: 5px;"></div>
        </div>
        <div id="progress-text" style="margin-top: 10px;">Iniciando...</div>`,
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => {
                enviarProximoLote();
            }
        });

        function atualizarProgresso() {
            const porcentagem = Math.round((loteAtual / totalLotes) * 100);
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');

            if (progressBar) {
                progressBar.style.width = `${porcentagem}%`;
            }
            if (progressText) {
                progressText.innerText = `${porcentagem}%`;
            }
        }

        function enviarProximoLote() {
            if (loteAtual >= totalLotes) {
                Swal.close();
                if (hasErro) {
                    toastr.error('Erro ao salvar alguns lotes.');
                } else {
                    toastr.success('Todas as alterações foram salvas com sucesso.');
                    gerarTabelaPerfisPlacas();
                }
                setUIEnabled(true);
                return;
            }

            const inicio = loteAtual * tamanhoLote;
            const fim = Math.min(inicio + tamanhoLote, dados.length);
            const lote = dados.slice(inicio, fim);

            atualizarProgresso();

            $.ajax({
                url: `${window.location.pathname}/SalvarEmpresaPerfilPlacas`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ empresaId: inputCompany.value, alteracoes: lote }),
                success: function () {
                    // OK
                },
                error: function () {
                    hasErro = true;
                },
                complete: function () {
                    loteAtual++;
                    enviarProximoLote();
                }
            });
        }
    }

    function limparTabelaPerfisPlacas() {
        if ($.fn.DataTable.isDataTable('#empresaPerfilPlacas')) {
            $('#empresaPerfilPlacas').DataTable().clear().destroy();
            $('#empresaPerfilPlacas thead').empty();
        }
    }

    function carregarPerfis() {
        setUIEnabled(false);

        limparTabelaPerfisPlacas();

        $.ajax({
            type: 'POST',
            url: `${window.location.pathname}/BuscarEmpresaPerfilDescricao`,
            data: { companyId: inputCompany.value },
            success: function (data) {
                if (data) {
                    const $select = $('#empresaPerfisSelect');

                    $select.empty();

                    data.forEach(perfil => {
                        const option = `<option value="${perfil.EmpresaPerfilId}">${perfil.PerfilDescricao}</option>`;
                        $select.append(option);
                    });

                    $select.selectpicker('refresh');
                }
            },
            error: function (profilesErr) {
                if (profilesErr && profilesErr.responseJSON) {
                    toastr['error'](profilesErr.responseJSON.message, profilesErr.responseJSON.title);
                }
            },
            complete: function () {
                setUIEnabled(true);
                atualizarEstadoBotoes();
            },
        });
    }

    function setUIEnabled(enabled) {
        $('#perfilEmpresaSelect').prop('disabled', !enabled).selectpicker('refresh');
        $('#empresaPerfisSelect').prop('disabled', !enabled).selectpicker('refresh');
        $('#empresaPerfilNomeInput').prop('disabled', !enabled);
        $('#btnEmpresaPerfilNovo').prop('disabled', !enabled);
        $('#btnEmpresaPerfilEditar').prop('disabled', !enabled);
        $('#btnEmpresaPerfilExcluir').prop('disabled', !enabled);
        $('#btnEmpresaPerfilSalvar').prop('disabled', enabled || modo === null); // Salvar só habilita no modo edição/criação
        $('#btnEmpresaPerfilCancelar').prop('disabled', enabled || modo === null);
        $('.action-select, .perfilEmpresaSalvarPlacas, .perfilEmpresaCarregarPlacas').prop('disabled', !enabled);
    }

    $('#perfilEmpresaSalvarPlacas').click(enviarAlteracoes);

    $('#perfilEmpresaSelect').change(function () {
        if ($.fn.DataTable.isDataTable('#empresaPerfilPlacas')) {
            $('#empresaPerfilPlacas').DataTable().clear().destroy();
            $('#empresaPerfilPlacas thead').empty();
        }

        atualizarEstadoBotoes();
        carregarPerfis();
    });

    $('.perfilEmpresaCarregarPlacas').click(function () {
        gerarTabelaPerfisPlacas();
    });

    $('#perfilEmpresaCancelarPlacas').click(function () {
        limparTabelaPerfisPlacas();
        atualizarEstadoBotoes();
    });

    let modo = null; // "novo" ou "editar"
    let perfilSelecionadoId = null;

    function resetarEstado() {
        $('#empresaPerfisSelect').prop('disabled', false).selectpicker('refresh');
        $('#empresaPerfilNomeInput').val('').prop('disabled', true);
        $('#btnEmpresaPerfilSalvar, #btnEmpresaPerfilCancelar').prop('disabled', true);
        modo = null;
        perfilSelecionadoId = null;
        atualizarEstadoBotoes();
    }

    // Novo
    $('#btnEmpresaPerfilNovo').on('click', function () {
        resetarEstado();
        modo = 'novo';

        $('#empresaPerfisSelect').prop('disabled', true).selectpicker('refresh');
        $('#empresaPerfilNomeInput').prop('disabled', false).val('');
        $('#btnEmpresaPerfilSalvar, #btnEmpresaPerfilCancelar').prop('disabled', false);

        $('#divPerfilEmpresaNovoEditar').show();
    });

    // Editar
    $('#btnEmpresaPerfilEditar').on('click', function () {
        const selecionados = $('#empresaPerfisSelect').val();
        if (!selecionados || selecionados.length !== 1) {
            toastr.warning('Selecione exatamente um perfil para editar.');
            return;
        }

        perfilSelecionadoId = selecionados[0];
        const texto = $('#empresaPerfisSelect option:selected').text();

        modo = 'editar';
        $('#empresaPerfilNomeInput').prop('disabled', true).selectpicker('refresh');
        $('#empresaPerfilNomeInput').prop('disabled', false).val(texto);
        $('#btnEmpresaPerfilSalvar, #btnEmpresaPerfilCancelar').prop('disabled', false);

        $('#divPerfilEmpresaNovoEditar').show();
    });

    // Excluir
    $('#btnEmpresaPerfilExcluir').on('click', function () {
        const selecionados = $('#empresaPerfisSelect').val();
        if (!selecionados || selecionados.length === 0) {
            toastr.warning('Selecione pelo menos um perfil para excluir.');
            return;
        }

        Swal.fire({
            title: 'Confirmação',
            text: `Deseja realmente excluir os perfis selecionados?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                setUIEnabled(false);

                $.ajax({
                    url: `${window.location.pathname}/DeletaEmpresaPerfil`,
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ perfisId: selecionados, companyId: inputCompany.value }),
                    success: function () {
                        toastr.success('Perfis excluídos com sucesso.');
                    },
                    complete: function () {
                        setUIEnabled(true);
                        resetarEstado();
                        carregarPerfis();
                    },
                    error: function (err) {
                        toastr.error('Erro ao excluir perfis.');
                    }
                });
            }
        });
    });

    // Cancelar
    $('#btnEmpresaPerfilCancelar').on('click', function () {
        resetarEstado();
        $('#divPerfilEmpresaNovoEditar').hide();
    });

    // Salvar
    $('#btnEmpresaPerfilSalvar').on('click', function () {
        const nomePerfil = $('#empresaPerfilNomeInput').val().trim();
        if (!nomePerfil) {
            toastr.warning('Informe um nome para o perfil.');
            return;
        }

        setUIEnabled(false);

        if (modo === 'novo') {
            $.ajax({
                url: `${window.location.pathname}/AtualizaEmpresaPerfil`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ descricao: nomePerfil, companyId: inputCompany.value }),
                success: function () {
                    toastr.success('Perfil criado com sucesso.');
                },
                complete: function () {
                    setUIEnabled(true);
                    resetarEstado();
                    $('#divPerfilEmpresaNovoEditar').hide();
                    carregarPerfis();
                },
                error: function () {
                    toastr.error('Erro ao criar perfil.');
                }
            });
        } else if (modo === 'editar') {
            $.ajax({
                url: `${window.location.pathname}/AtualizaEmpresaPerfil`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ empresaPerfilId: perfilSelecionadoId, descricao: nomePerfil, companyId: inputCompany.value }),
                success: function () {
                    toastr.success('Perfil atualizado com sucesso.');
                },
                complete: function () {
                    setUIEnabled(true);
                    resetarEstado();
                    $('#divPerfilEmpresaNovoEditar').hide();
                    carregarPerfis();
                },
                error: function () {
                    toastr.error('Erro ao atualizar perfil.');
                }
            });
        }
    });

    const pt_br = {
        "emptyTable": "Nenhum registro encontrado",
        "info": "_START_ - _END_ de _TOTAL_",
        "infoEmpty": "0 - 0 de 0",
        "infoFiltered": "(Filtrados de _MAX_ registros)",
        "infoThousands": ".",
        "loadingRecords": "Carregando...",
        "processing": '<div class="spinner-border text-primary" role="status"><span class="visually-hidden"> Loading...</span></div>',
        "zeroRecords": "Nenhum registro encontrado",
        "lengthMenu": "Exibir _MENU_ resultados",
        "search": "Pesquisar",
        "paginate": {
            "next": "Próximo",
            "previous": "Anterior",
            "first": "Primeiro",
            "last": "Último"
        },
    };

    atualizarEstadoBotoes();
});