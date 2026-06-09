/* JavaScript Modernizado */

// Variables de estado encapsuladas
let kwargs = [];
let endFiles = false;

// Nota: Asumo que 'arrayGroup' y 'userLanguage' se definen externamente.
// Si no, deberían pasarse como parámetros.

function main() {
    // Ocultar select de fecha al inicio con CSS nativo o jQuery simplificado
    $('select[name=date]').hide();

    $('input[accept=".xls,.xlsx"]').on('change', function (e) {
        kwargs = [];
        const files = e.target.files;
        if (!files.length) return;

        let processedFilesCount = 0;

        Array.from(files).forEach(file => {
            const reader = new FileReader();

            reader.onload = function (event) {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                jsonData.forEach(item => {
                    let row = []; // CORREGIDO: Declaración explícita de variable local
                    let dateTime;

                    // Tipo 1: Cuenta Bancaria (12 columnas)
                    if (item.length === 12 && $.isNumeric(item[0])) {
                        // Corrección de fecha base de Excel (30/12/1899)
                        dateTime = new Date(new Date(1899, 11, 30).getTime() + parseInt(item[0]) * 24 * 60 * 60 * 1000);
                        
                        row.push(dateTime.toISOString()); 
                        row.push(item[2]);                              // Concepto
                        row.push(setGroup(item[2]));                    // Grupo
                        row.push(parseFloat(item[3]));                  // Importe (Numérico)
                        row.push("+");                                  // Signo

                    // Tipo 2: Tarjeta (6 columnas)
                    } else if (item.length === 6 && item[0] && $.isNumeric(item[0][0])) {
                        const dateStr = item[0];
                        const timeStr = item[1];
                        
                        dateTime = new Date(
                            dateStr.substring(6), 
                            parseInt(dateStr.substring(3, 5)) - 1, 
                            dateStr.substring(0, 2), 
                            timeStr.substring(0, 2), 
                            timeStr.substring(3)
                        );

                        row.push(dateTime.toISOString());
                        row.push(item[2]);                               // Comercio / Concepto
                        row.push(setGroup(item[2]));                     // Grupo
                        row.push(parseFloat(item[4].replace(',', '.'))); // Importe (Numérico)
                        row.push(item[3]);                               // Signo
                        
                    }

                    // Guardar si no está marcado para borrar
                    if (row.length > 0 && row[2] !== 'delete') {
                        kwargs.push(row);
                    }
                });

                processedFilesCount++;
                endFiles = (files.length === processedFilesCount);
                update();
            };

            reader.readAsArrayBuffer(file);
        });
    });

    $('select[name=date]').on('change', function() {
        divTable($(this).val());
    });

    update();
}

function update() {
    if (!endFiles) return;

    // Ocultar la subida de ficheros de forma limpia
    $('input[type=file]').hide();

    // Ordenar cronológicamente por Fecha de operación
    kwargs.sort((a, b) => a[0].localeCompare(b[0]));

    const $selectDate = $('select[name=date]').empty().show();
    let lastMonthYear = '';
        
    kwargs.forEach(item => {
        const monthYear = item[0].substring(0, 7); // YYYY-MM
        if (lastMonthYear !== monthYear) {
            $selectDate.append($('<option>', { value: monthYear, text: monthYear }));
            lastMonthYear = monthYear;
        }
    });

    if (kwargs.length > 0) {
        divTable(kwargs[0][0].substring(0, 7));
    }
}

function setGroup(value = '') {
    if (!value) return '';
    // Asumiendo que arrayGroup existe globalmente.
    // Optimización: buscar coincidencia
    const match = arrayGroup.find(item => value.includes(item[0].trimEnd()));
    return match ? match[1].trimEnd() : value;
}

function divTable(index) {
    if (!index) return;

    // Estructuras base como Maps para búsquedas O(1) rápidas
    const ingresosBase = ['Nómina', 'Interes', 'Otros', 'Nómina extra', 'Inquilinos', 'Pilar'];
    const gastosBase = ['Luz', 'Agua', 'Contribución', 'Seguro', 'Plan Pensión', 'Gas', 'Móvil', 'Internet', 'Automóvil', 'SubComunidad', 'Comunidad', 'Otros', 'Caprichos', 'Casero', 'Farmacía', 'Alldebrid'];

    // Filtrar movimientos del mes seleccionado
    const kwargsIndex = kwargs.filter(item => item[0].substring(0, 7) === index);

    // Agrupar saldos por categoría directamente como números (evitamos el truco de "+1+2+3")
    const totalPorGrupo = {};
    
    kwargsIndex.forEach(item => {
        const grupo = item[2];
        const importe = item[3];
        
        if (!totalPorGrupo[grupo]) {
            totalPorGrupo[grupo] = { total: 0, tipo: importe > 0 ? 'ingresos' : 'gastos' };
        }
        totalPorGrupo[grupo].total += (item[4] != "COMPRA" && item[4] != "+"?-1 :+1) * Math.abs(importe);
    });

    // Construir listas finales asociando los datos calculados
    const ingresosFinal = ingresosBase.map(cat => [cat, totalPorGrupo[cat]?.tipo === 'ingresos' ? totalPorGrupo[cat].total : 0]);
    const gastosFinal = gastosBase.map(cat => [cat, totalPorGrupo[cat]?.tipo === 'gastos' ? totalPorGrupo[cat].total : 0]);

    // Añadir grupos nuevos/extra que vinieran en el Excel y no estaban en la base
    Object.entries(totalPorGrupo).forEach(([grupo, info]) => {
        if (info.tipo === 'ingresos' && !ingresosBase.includes(grupo)) {
            ingresosFinal.push([grupo, info.total]);
        } else if (info.tipo === 'gastos' && !gastosBase.includes(grupo)) {
            gastosFinal.push([grupo, info.total]);
        }
    });

    // Renderizado de UI
    $('div.table').remove();
    
    const lang = typeof userLanguage !== 'undefined' ? userLanguage : navigator.language;
    const months = Array.from({length: 12}, (_, i) => new Intl.DateTimeFormat(lang, {month: 'long'}).format(new Date(0, i)).substr(0,3));
    
    let dateFormat = months[parseInt(index.split('-')[1]) - 1] + '.-' + index.split('-')[0];
    const $nuevoDiv = $(`<div class='table'></div>`);
    const html = [`<div><div>PERIODO</div><div>INGRESOS</div><div>PAGADOR</div><div>GASTOS</div><div>CONCEPTO</div></div>`];

    const maxFilas = Math.max(ingresosFinal.length, gastosFinal.length);

    for (let i = 0; i < maxFilas; i++) {
        const ing = ingresosFinal[i] || ['', 0];
        const gas = gastosFinal[i] || ['', 0];

        // Solo formatear a string con comas al renderizar en pantalla
        const txtIngresoValue = ing[1] > 0 ? `+${ing[1].toFixed(2).replace('.', ',')}` : '';
        const txtIngresoCat = ing[0];
        const txtGastoValue = gas[1] > 0 ? `+${gas[1].toFixed(2).replace('.', ',')}` : '';
        const txtGastoCat = gas[0];

        html.push(`<div>
            <div>${dateFormat}</div>
            <div>${txtIngresoValue}</div>
            <div>${txtIngresoCat}</div>
            <div>${txtGastoValue}</div>
            <div>${txtGastoCat}</div>
        </div>`);
        
        dateFormat = '';            
    }

    $nuevoDiv.html(html.join(' '));
    $('body').append($nuevoDiv);

    // Evento de copia moderno (Clipboard API)
    $('.table div div').css('cursor', 'copy').on('click', function() {
        const texto = $(this).text().trim();
        if (texto) {
            navigator.clipboard.writeText(texto)
                .then(() => toast('¡Texto copiado!', 3000))
                .catch(err => console.error('Error al copiar: ', err));
        }
    });        
}