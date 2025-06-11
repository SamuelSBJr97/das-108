if (data) {
    const perfilEmpresa = data.perfilEmpresa;
    const perfilPlaca = data.perfilPlaca;

    function empresaPerfilColumn(data, type, row, meta) {
        const perfilId = meta?.settings?.aoColumns[meta.col]?.perfilId;
        const veiculoId = row.VeiculoId;

        if (type === 'display') {
            const checked = data ? 'checked' : '';

            return `<div class="form-check d-flex justify-content-center align-items-center">
                <input type="checkbox" class="associado-checkbox"
                    data-veiculoid="${veiculoId}"
                    data-perfilid="${perfilId}"
                    ${checked} /></div>`;
        }

        if (type === 'sort' || type === 'type') {
            return data ? 1 : 0;
        }


        return data ? 'true' : 'false';
    }

    function createdCell(td, cellData, rowData, row, col) {
        $(td).addClass('associado-checkbox text-center');
    }

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
        order: [[1, 'asc']]
    });

    function empresaPerfilFilterInput() {
        const colIndex = $(this).closest('th').index();
        table.column(colIndex).search(this.value).draw();
    }

    $('#empresaPerfilPlacas thead th').on('keyup change', '.filter-input', empresaPerfilFilterInput);

    function empresaPerfilFilterSelect() {
        const colIndex = $(this).closest('th').index();
        const val = $(this).val();

        table.column(colIndex).search(val).draw();
    }

    $('#empresaPerfilPlacas thead th')
        .on('change', '.filter-select', empresaPerfilFilterSelect);


    const $empresaPerfilPlacasTbody = $('#empresaPerfilPlacas tbody');

    function perfilEmpresaOpcoesSelecao(event) {
        if (!event.originalEvent) {
            // Alteração feita via código — ignorar
            return;
        }

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

            // Itera sobre todas as chaves relacionadas a perfis em rowData
            Object.keys(rowData).forEach(key => {
                if (key.startsWith('perfil_') && rowData[key] !== null) { // Processa apenas células de perfil não bloqueadas
                    const isTargetColumn = (key === colDataSrc);
                    const finalStateForCell = isTargetColumn ? newTargetState : false;

                    // Atualiza os dados no DataTable
                    rowData[key] = finalStateForCell;

                    // Atualiza o DOM do checkbox
                    const perfilId = key.substring('perfil_'.length);
                    const checkbox = trNode.find(`input.associado-checkbox[data-perfilid="${perfilId}"]`);
                    if (checkbox.length) {
                        checkbox.prop('checked', finalStateForCell);
                    }
                }
            });
        });

        $this.val('').trigger('change');

        setUIEnabled(true);
    }

    // Event delegation robusta (funciona no Edge, Chrome, Firefox, etc.)
    $('#empresaPerfilPlacas thead th').on('change', '.action-select', perfilEmpresaOpcoesSelecao);

    function inputAssociadoCheckbox(event) {
        if (!event.originalEvent) {
            // Alteração feita via código — ignorar
            return;
        }

        setUIEnabled(false);

        const $this = $(this);
        const checkbox = $this.is('input') ? $this : $this.find('input');

        // Alterna o estado do checkbox
        const isChecked = !checkbox.prop('checked');
        checkbox.prop('checked', isChecked);

        // Extrai os dados do checkbox
        const veiculoId = checkbox.data('veiculoid');
        const perfilId = checkbox.data('perfilid');
        const colData = `perfil_${perfilId}`;

        // Encontra a linha correspondente no DataTable
        const rowData = table.data().toArray().find(r => r.VeiculoId == veiculoId);

        if (rowData) {
            rowData[colData] = isChecked;

            Object.keys(rowData).forEach(key => {
                if (key.startsWith('perfil_')) {
                    if (key != colData) {
                        rowData[key] = false;

                        const idPerfil = key.substring('perfil_'.length);
                        const checkbox = $this.closest('tr').find(`input.associado-checkbox[data-perfilid="${idPerfil}"]`);
                        if (checkbox.length) {
                            checkbox.prop('checked', false);
                        }
                    }
                }
            });
        }

        setUIEnabled(true);
    }

    $empresaPerfilPlacasTbody.on('click change', '.associado-checkbox', inputAssociadoCheckbox);
}