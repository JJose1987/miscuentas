/* JavaScript */
/* https://www.degraeve.com/reference/urlencoding.php */
// Variables
var kwargs   = [];
var kwargSum = [];
var kwargCpy = '';

// Funciones
function main() {
    $('.material-symbols-outlined').on('click', function() {
        if ($(this).text() == 'upload_file') {
            $('input[accept=".xls"]').click();
        } else if ($(this).text() == 'mop') {
            kwargCpy = '';
            divTable($('select[name=date]').val());
        } else if ($(this).text() == 'content_copy') {
            // Crea un lugar temporal para guardar el valor a copiar
            var $temp = $('<input>').val(kwargCpy).appendTo('body').select();
            // Ejecuta el evento copiar
            document.execCommand('copy');
            //  Borra temporal
            $temp.remove();
            
            toast('Texto copiado', 3000);
        } else if ($(this).text() == 'remove_selection') {
            // Borrar aquellos que se han marcado
            $('div.table div div[onclick]').each(function() {
                // Obtener el valor del atributo onclick
                var onclickValue = $(this).attr('onclick');

                // Usar una expresión regular para extraer el nombre de la función y el argumento
                var regex = /(\w+)\(([^)]+)\)/;
                var match = onclickValue.match(regex);

                if (match) {
                    // match[1] es el nombre de la función
                    // match[2] es el argumento
                    if (match[1] == 'ocultar' && rgbToHex($(this).css('background-color')) == '#dfffdd') {
                        ocultar(match[2]);
                    }
                }
            });
            
            // Copia importes
            // Crea un lugar temporal para guardar el valor a copiar
            var $temp = $('<input>').val(kwargCpy).appendTo('body').select();
            // Ejecuta el evento copiar
            document.execCommand('copy');
            //  Borra temporal
            $temp.remove();
            
            toast('Texto copiado', 3000);
        } else if ($(this).text() == 'undo') {
            $.each(kwargSum, function (i, item) {
                if (item[0] == $('select[name=date]').val()) {
                    item[3] = true;
                    kwargSum[i] = item;
                }
            });

            divTable($('select[name=date]').val());
        }
    });
    
    $('input[accept=".xls"]').on('change', function() {
        var file = this.files[0];

        var reader = new FileReader();

        reader.onload = function(e) {
            var data = new Uint8Array(e.target.result);
            var workbook = XLSX.read(data, { type: 'array' });

            // Leer la primera hoja
            var firstSheetName = workbook.SheetNames[0];
            var worksheet = workbook.Sheets[firstSheetName];
            var json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Mostrar los datos en el div de salida
            json.forEach(row => {
                var out = [];

                if (row.length == 6) {
                    // Tarjetas
                    var aux0 = new Date(row[0].substring(6), row[0].substring(3,5), row[0].substring(0,2));
                    if (aux0 != 'Invalid Date') {
                        row[0] = `${aux0.getFullYear()}${('0' + aux0.getMonth()).slice(-2)}`;
                        if (aux0.getMonth() == 0){
                            row[0] = `${aux0.getFullYear() - 1}${'12'}`;
                        }
                    }

                    out.push(row[0]);
                    out.push(row[2]);
                    out.push(parseFloat(row[4].replace(',', '.')));
                } else if (row.length == 12) {
                    // Cuentas
                    var aux0 = new Date((new Date(1899, 11, 30)).getTime() + row[0] * 24 * 60 * 60 * 1000);
                    if (aux0 != 'Invalid Date') {
                        row[0] = `${aux0.getFullYear()}${('0' + (aux0.getMonth() + 1)).slice(-2)}`;
                    }

                    out.push(row[0]);
                    out.push(row[2]);
                    out.push(parseFloat(row[3]));
                }

                if (out.length == 3) {
                    if ((out[0].indexOf('Fecha ') == -1)
                            && (out[1].indexOf('REC.MCARD ') == -1)) {
                        kwargs.push(out);
                    }
                }
            });

            // Ordenar por (0, 1) y quitar duplicados
            kwargs = (kwargs.filter((item, index, self) => index === self.findIndex((t) => (t[0] === item[0] && t[1] === item[1] && t[2] === item[2]))))
                .sort(function(a, b) {
                    // Comparar el campo 0 (fecha)
                    var dateA = new Date(a[0]);
                    var dateB = new Date(b[0]);

                    if (dateA < dateB) return -1;
                    if (dateA > dateB) return 1;

                    // Si las fechas son iguales, comparar el campo 1 (nombre)
                    if (a[1] < b[1]) return -1;
                    if (a[1] > b[1]) return 1;

                    return 0; // Si son iguales
                });

            update();
        };

        reader.readAsArrayBuffer(file);
    });
    
    $('select[name=date]').on('change', function() {
        divTable($(this).val());
    });

    update();
}

// Actualizar valores de la clase
function update() {
    // Agrupar por 0, 1
    // Iterar sobre los datos y acumular los valores
    var auxSum  = {};
    var auxDate = [];

    $.each(kwargs, function(i, item) {
        var key = item[0] + '|' + item[1]; // Crear una clave única para la combinación de campo 0 y 1
        if (!auxSum[key]) {
            auxSum[key] = 0; // Inicializar si no existe
        }
        auxSum[key] += item[2]; // Sumar el campo 2

        auxDate.push(item[0]);
    });
    
    // auxDate (quitar duplicados y ordenar)
    $.unique(auxDate).sort(function(a, b) {
        return a - b;
    });
    
    // Informar select[name=date] para luego elegir ese periodo
    $('select[name=date]').empty();
    $.each(auxDate, function (i, item) {
        $('[name=date]').append($('<option>', {
            value: item,
            text : item
        }));
    });

    kwargSum = [];
    $.each(auxSum, function(i, item) {
        var i0 = i.split('|')[0];
        var i1 = i.split('|')[1];

        kwargSum.push([i0, i1, item, true]);
    });
    
    divTable(auxDate[0]);
}

// Informar tabla
function divTable(index) {
    if (typeof index != 'undefined') {
        var div = '<div><div>Concepto</div><div>Importe</div><div>Borrar</div></div>';
    
        $.each(kwargSum, function (i, item) {
            if (item[0] == index) {
                if (item[3]) {
                    div += '<div>'
                            +  '<div>' + item[1] + '</div>'
                            + `<div onclick="importe(${i})">${formatNumber(item[2])}</div>`
                            + `<div onclick="ocultar(${i})"><span class="material-symbols-outlined" >delete</span></div>`
                        +  '</div>'
                    +  '</div>';
                }
            }
        });
    
        $('#dnone').css({display: ''});
        
        $('[class=table]').css({display: ''});
        $('[class=table]').empty();
        $('[class=table]').append(div);
    } else {
        $('#dnone').css({display: 'none'});
        $('[class=table]').css({display: 'none'});
    }

    kwargCpy = '';
    $('#importe').css({display: 'none'});
    $('#importe').empty();

    $("span.material-symbols-outlined:contains('content_copy')").hide();
    $("span.material-symbols-outlined:contains('remove_selection')").hide();
    $("span.material-symbols-outlined:contains('content_copy')").hide();
    $("span.material-symbols-outlined:contains('mop')").hide();
    undoShow();
}

function formatNumber(value) {
    value = value.toFixed(2);
    let [integerPart, decimalPart = '0'] = value.toString().split('.');
    integerPart = (integerPart.startsWith('-') ? '-' : '+') + integerPart.replace('-', '').padStart(6, '0');
    decimalPart = decimalPart.padEnd(2, '0');
    return `${integerPart},${decimalPart}`;
}

// Que a esta funcion el entre un index, similiar al de ocultar. Que no pierda el cambio de color de la celda (voy a cambiarlo por la fila)
function importe(index) {
    // Guardamos el importe en una auxiliar y le cambiamos le signo
    var aux = formatNumber(kwargSum[index][2]);

    aux = aux.replace('+', '+');
    aux = aux.replace('-', '+');

    // Seleccionamos la fila con el texto
    var row = $('div.table div').filter(function() {
        return $(this).text() == kwargSum[index][1] + formatNumber(kwargSum[index][2]) + 'delete';  // Filtramos por el texto que contiene el concepto
    });
    
    // Cambiamos el color de fondo de esa fila
    if (rgbToHex(row.find('div').css('background-color')) == '#dfffdd') {
        // Eliminar
        row.find('div').css('background-color', '#e5eef0');
        
        kwargCpy = kwargCpy.replace(aux, '');

        if (kwargCpy == '') {
            kwargCpy = '';
            $('#importe').css({display: 'none'});
            $("span.material-symbols-outlined:contains('content_copy')").hide();
            $("span.material-symbols-outlined:contains('remove_selection')").hide();
            $("span.material-symbols-outlined:contains('content_copy')").hide();
            $("span.material-symbols-outlined:contains('mop')").hide();
            undoShow();
        }
    } else {
        // Insertar
        row.find('div').css('background-color', '#dfffdd');

        if (kwargCpy == '') {
            kwargCpy += '';
        }

        kwargCpy += aux;
        $("span.material-symbols-outlined:contains('content_copy')").show();
        $("span.material-symbols-outlined:contains('remove_selection')").show();
        $("span.material-symbols-outlined:contains('content_copy')").show();
        $("span.material-symbols-outlined:contains('mop')").show();
        undoShow();
    }

    $('#importe').css({display: (kwargCpy == ''?'none':'')});
    $('#importe').empty();
    $('#importe').append(kwargCpy);
}

function ocultar(index) {
    kwargSum[index][3] = false;
    divTable($('select[name=date]').val());
}

function undoShow() {
    $("span.material-symbols-outlined:contains('undo')").hide();

    $.each(kwargSum, function (i, item) {
        if (item[0] == $('select[name=date]').val() && !item[3]) {
            $("span.material-symbols-outlined:contains('undo')").show();
            return;
        }
    });
}
