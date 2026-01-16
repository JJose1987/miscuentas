/* JavaScript */
/* https://www.degraeve.com/reference/urlencoding.php */
// Variables
var kwargs = [];
var endFiles  = false;
// Funciones
function main() {
    //
    $('select[name=date]').css({display: 'none'});
    //
    $('input[accept=".xls,.xlsx"]').on('change', function (e) {
        kwargs = [];

        let files = e.target.files;
        let ifile = 0;

        Array.from(files).forEach(file => {
            let reader = new FileReader();

            reader.onload = function (event) {
                let data = new Uint8Array(event.target.result);
                let workbook = XLSX.read(data, { type: 'array' });

                // Primera hoja
                let sheetName = workbook.SheetNames[0];
                let worksheet = workbook.Sheets[sheetName];
                // Convertir a JSON
                let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                jsonData.forEach(item => {
                    row = [];
                    // Cuenta    : Fecha de operación, Fecha valor, Concepto, Importe, Divisa, Saldo, Divisa, Nº mov, Oficina
                    // Tarjeta   : Fecha operación, Hora, Nombre comercio, Concepto, Importe, Divisa

                    // Resultado : Fecha de operación + Hora, Concepto, 'Grupo', Importe    
                    var date_time;
                    if (item.length == 12 && $.isNumeric(item[0])) {
                        // Cuenta
                        date_time = new Date((new Date(1899, 11, 30)).getTime() + parseInt(item[0]) * 24 * 60 * 60 * 1000);

                        row.push(date_time.toISOString());              // Fecha de operación
                        row.push(item[2]);                              // Concepto
                        row.push(setGroup(item[2]));                    // Grupo
                        row.push(parseFloat(item[3]));                  // Importe

                        if (row[2] != 'delete') {
                            kwargs.push(row);
                        }
                    } else if (item.length == 6 && $.isNumeric(item[0][0])) {
                        // Tarjeta
                        date_time = new Date((item[0]).substring(6), parseInt((item[0]).substring(3,5) - 1), (item[0]).substring(0,2), (item[1]).substring(0,2), (item[1]).substring(3));

                        row.push(date_time.toISOString());               // Fecha de operación + Hora
                        row.push(item[2]);                               // Concepto
                        row.push(setGroup(item[2]));                     // Grupo
                        row.push(parseFloat(item[4].replace(',', '.'))); // Importe

                        if (row[2] != 'delete') {
                            kwargs.push(row);
                        }
                    }
                });

                endFiles = (files.length == ++ifile);
                update();
            };

            reader.readAsArrayBuffer(file);
        });
    });
    //
    $('select[name=date]').on('change', function() {
        divTable($(this).val());
    });

    update();
}

// Actualizar valores de la clase
function update() {
    // Mostrar por mes y año
    // la interfaz {como mi excel de cuentas...}
    if (endFiles == true) {
        // Ocultar la subida de ficheros
        $('input').height(0).css({display: 'none'});
        // Ordenar por (Fecha de operación)
        kwargs = kwargs.sort(function(a, b) {
                    // Comparar el campo 0 (Fecha de operación)
                    // Devolver -1 (menor), +1 (mayor), 0 (iguales)
                    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
                });

        var act = '';
        
        $('select[name=date]').css({display: ''}).empty();
            
        $.each(kwargs, function(i, item) {
            if (act != item[0].substring(0, 7)) {
                $('[name=date]').append($('<option>', {
                    value: item[0].substring(0, 7),
                    text : item[0].substring(0, 7)
                }));

                act = item[0].substring(0, 7);
            }
        });

        divTable(kwargs[0][0].substring(0, 7))
    }
}

// Obtener grupo del Concepto(Cuenta) o Nombre comercio(Tarjeta)
function setGroup(value = '') {
    var out = value;

    $.each(arrayGroup, function(i, item) {
        if (value.indexOf(item[0].trimEnd()) >= 0) {
            out = item[1].trimEnd();
            return;
        }
    });

    return out;
}

// Actualiza la vista del mes selecionado
function divTable(index) {
    if (typeof index != 'undefined') {
        // Tablas base
        var ingresos = [
              ['Nómina'      , '+0'] 
            , ['Interes'     , '+0'] 
            , ['Otros'       , '+0'] 
            , ['Nómina extra', '+0'] 
            , ['Inquilinos'  , '+0'] 
            , ['Pilar'       , '+0']];

        var gastos = [              
              ['Luz'         , '+0'] 
            , ['Agua'        , '+0']
            , ['Contribución', '+0'] 
            , ['Seguro'      , '+0'] 
            , ['Plan Pensión', '+0']
            , ['Gas'         , '+0']
            , ['Móvil'       , '+0']
            , ['Internet'    , '+0']
            , ['Automóvil'   , '+0']
            , ['SubComunidad', '+0']
            , ['Comunidad'   , '+0']
            , ['Otros'       , '+0']
            , ['Caprichos'   , '+0']
            , ['Casero'      , '+0']
            , ['Farmacía'    , '+0']
            , ['Alldebrid'   , '+0']];
        // Extraemos el array del mes indicado
        var kwargsIndex = (kwargs.filter(item => item[0].substring(0, 7) == index))
            .sort(function(a, b) {
                    // Comparar el campo 2 (Grupo)
                    // Devolver -1 (menor), +1 (mayor), 0 (iguales)
                    return a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0;
                });

        // Lo ordenanos y agrupamos por Grupo y le indicamos si es gastos o ingresos
        var kwgroup = {};
        var antGroup = kwargsIndex[0][2];
        kwgroup[kwargsIndex[0][2]] = ['', ''];

        $.each(kwargsIndex, function(i, item) {
            if (antGroup != item[2]) {
                kwgroup[item[2]] = ['', ''];

                antGroup = item[2];
            }

            kwgroup[item[2]][0] += ('+' + Math.abs(item[3])).replace('.', ',');

            if (kwgroup[item[2]][1] == '') {
                kwgroup[item[2]][1] = 'gastos';
                if (item[3] > 0) {
                    kwgroup[item[2]][1] = 'ingresos';
                }
            }
        });
        // 

        var kwgroupFil = null;
        // Lo mandamos a la tabla correspondiente: ingresos
        kwgroupFil = Object.entries(kwgroup).filter(([_, values]) => values[1] === 'ingresos').map(([index, _]) => [index, kwgroup[index][0]]);

        $.each(ingresos, function(i, item) {
            if ((kwgroupFil.filter(item0 => item0[0] == item[0])).length == 1) {
                ingresos[i][1] = kwgroupFil.filter(item0 => item0[0] == item[0])[0][1];
                kwgroupFil = kwgroupFil.filter(item0 => item0[0] != item[0]);
            }
        });

        $.merge(ingresos, kwgroupFil);
        // Lo mandamos a la tabla correspondiente: gastos
        kwgroupFil = Object.entries(kwgroup).filter(([_, values]) => values[1] === 'gastos').map(([index, _]) => [index, kwgroup[index][0]]);

        $.each(gastos, function(i, item) {
            if ((kwgroupFil.filter(item0 => item0[0] == item[0])).length == 1) {
                gastos[i][1] = kwgroupFil.filter(item0 => item0[0] == item[0])[0][1];
                kwgroupFil = kwgroupFil.filter(item0 => item0[0] != item[0]);
            }
        });

        $.merge(gastos, kwgroupFil);
        // **
        $('div.table').remove();
        // Crear un array con los nombres abreviados de los meses
        var meses = Array.from({length: 12}, (_, i) => (new Intl.DateTimeFormat(userLanguage, {month: 'long' }).format(new Date(0, i))).substr(0,3) + '.');
        // Separar la fecha en año y mes
        var dateFormat = meses[parseInt(index.split('-')[1]) - 1] + '-' + index.split('-')[0];
        // Crear un nuevo div con el contendio de ese mes

        var nuevoDiv = $(`<div class='table'></div>`);
        var html = [];
        html.push(`<div><div>PERIODO</div><div>INGRESOS</div><div>PAGADOR</div><div>GASTOS</div><div>CONCEPTO</div></div>`);
        // Datos por defecto
        for (var i = 0; i < Math.max(ingresos.length, gastos.length) + 1; i++) {
            var out = [ingresos, gastos].flatMap(a => a[i] ? [+addsImport(a[i][1]), a[i][0]] : ['', '']);

            html.push(`<div><div>${dateFormat}</div><div>${out[0]}</div><div>${out[1]}</div><div>${out[2]}</div><div>${out[3]}</div></div>`);
            dateFormat = '';            
        }

        nuevoDiv.html(html.join(' '));
        // Añadir el nuevo div al final del body
        $('body').append(nuevoDiv);
        // Evento onClick
        $('.table div div').on('click', function() {
            if (($(this).css('cursor') == 'pointer') && ($(this).text() != '')) {
                // Crear elemento textarea con el array generado y seleccionar el contenido
                var $temp = $('<textarea>').val($(this).text()).appendTo('body').select();
                // Ejecuta el evento copiar al portapaleles
                document.execCommand('copy');
                // Borra de la variable temporal creada
                $temp.remove();
        
                toast('¡Texto copiado!', 3000);
            }
        });        
    }
}

function addsImport(value = '') {
    var out = 0;
    
    $.each(value.replace(',', '.').split('+').filter(item => item != ''), function(index, value) { 
        out += parseFloat(value);
    });

    return (Math.round(out * 100) / 100);
}