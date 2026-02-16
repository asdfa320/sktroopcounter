javascript:
// Create global object if it does not exist
if (!troopCounter) var troopCounter = {};

var table;
var troopSums = [];
var defaultRow = '0';

// Link to villages overview with units
troopCounter.link = "/game.php?&village=" + game_data.village.id + "&type=complete&mode=units&group=0&page=-1&screen=overview_villages";
if (game_data.player.sitter != 0)
    troopCounter.link = "/game.php?t=" + game_data.player.id + "&village=" + game_data.village.id + "&type=complete&mode=units&group=0&page=-1&screen=overview_villages";

troopCounter.groupsFetched = false;

// Image identifiers for units (game-internal names do not change)
troopCounter.unitImages = "spear,sword,axe,archer,spy,light,marcher,heavy,ram,catapult,knight,snob".split(",");

// Encoded unit names for wiki anchors – keep as in original
troopCounter.unitNames = "Pikinier,Miecznik,Topornik,.C5.81ucznik,Zwiadowca,Lekki_Kawalerzysta,.C5.81ucznik_na_koniu,Ci.C4.99.C5.BCki_kawalerzysta,Taran,Katapulta,Rycerz,Szlachcic".split(",");

// Build popup HTML (UI text is Slovak)
var popup = "";
popup += "<h2 align='center'>Stav vojska</h2>";
popup += "<table width='100%'>";

// Group selector
popup += "<tr><th>Skupina: ";
popup += "<select id='groupList' onchange=\"troopCounter.link = this.value; fetchData();\">";
popup += "<option value='" + troopCounter.link + "'>Aktuálna skupina</option>";
popup += "</select>";
popup += "</th></tr>";

// Type selector (example options – adjust values as needed)
popup += "<tr><td><table width='100%'>";
popup += "<tr><th colspan='4'>Typ: ";
popup += "<select onchange=\"changeView(this.value);\">";
popup += "<option value='0'>Dostupné vojsko</option>";
popup += "<option value='0p2p3'>Všetky vlastné</option>";
popup += "<option value='1'>Vojsko v dedinách</option>";
popup += "<option value='2'>Vojsko na pochode</option>";
popup += "<option value='3'>Vojsko mimo dedín</option>";
popup += "</select>";
popup += "</th></tr>";
popup += "</table></td></tr>";

// Container for results and controls
popup += "<tr><td>";
popup += "<div id='available_troops'></div>";
popup += "<br>";
popup += "<span id='village_count'></span>";
popup += " | <a href='javascript:void(0);' onclick='exportTroops();'>Exportovať</a>";
popup += "</td></tr>";

popup += "</table>";

// Show popup dialog
Dialog.show("message_popup", popup);

// Initial fetch
fetchData();
void 0;

// Toggle between export textarea and normal view
function exportTroops() {
    if (!$("#available_troops").html().match("textarea"))
        $("#available_troops").html(troopCounter.exportText);
    else
        changeView(defaultRow);
}

// Fetch data from the villages overview page
function fetchData() {
    $("#village_count").html(" Čakaj...");
    $(mobile ? '#loading' : '#loading_content').show();

    var r = new XMLHttpRequest();
    r.open('GET', troopCounter.link, true);

    function processResponse() {
        if (r.readyState == 4 && r.status == 200) {
            var requestedBody = document.createElement("body");
            requestedBody.innerHTML = r.responseText;

            // Units table
            table = $(requestedBody).find('#units_table').get()[0];

            if (!table) {
                $("#available_troops").html("Zvolená skupina nemá žiadne dediny. <br>Zvoľ inú skupinu.");
                $("#village_count").html(" chyba");
                return false;
            }

            // Group links/options
            var groups = $(requestedBody).find('.vis_item').get()[0]
                .getElementsByTagName(mobile ? 'option' : 'a');

            // Safety limit for very large accounts
            if (table.rows.length > 4000)
                alert("Upozornenie\nSčítavam len prvých 1000 dedín");

            if (!troopCounter.groupsFetched) {
                for (var i = 0; i < groups.length; i++) {
                    var name = groups[i].textContent;
                    if (mobile && groups[i].textContent == "wszystkie") continue;

                    $("#groupList").append($('<option>', {
                        value: groups[i].getAttribute(mobile ? "value" : "href") + "&page=-1",
                        text: mobile ? name : name.slice(1, name.length - 1)
                    }));
                }

                troopCounter.groupsFetched = true;

                // Remove archers if they are not present in this world
                if (!table.rows[0].innerHTML.match("archer")) {
                    troopCounter.unitImages.splice(troopCounter.unitImages.indexOf("archer"), 1);
                    troopCounter.unitImages.splice(troopCounter.unitImages.indexOf("marcher"), 1);
                }

                // Remove knight if not present
                if (!table.rows[0].innerHTML.match("knight"))
                    troopCounter.unitImages.splice(troopCounter.unitImages.indexOf("knight"), 1);
            }

            // Calculate sums and show default view
            calculateSums();
            changeView(defaultRow);
        }
    }

    r.onreadystatechange = processResponse;
    r.send(null);
}

// Change view according to selection (combining different row groups)
function changeView(text) {
    defaultRow = text;
    var which = String(text).match(/\d+/g);       // indices like [0,2,3]
    var actions = String(text).match(/[a-z]/g);   // operators like ['p','m'] etc.

    var newSum = [];
    for (var j = 0; j < troopCounter.unitImages.length; j++)
        newSum[j] = 0;

    for (var i = 0; i < which.length; i++) {
        if (i == 0 || actions[i - 1] == "p")      // 'p' = plus / add
            newSum = addSums(newSum, troopSums[which[i]]);
        else                                      // otherwise subtract
            newSum = subtractSums(newSum, troopSums[which[i]]);
    }

    renderResult(newSum);
}

// Calculate troop sums per row type
function calculateSums() {
    // There are 5 logical row groups in the original script
    for (var i = 0; i < 5; i++) {
        troopSums[i] = [];
        for (var j = 0; j < troopCounter.unitImages.length; j++)
            troopSums[i][j] = 0;
    }

    for (var i = 1; i < table.rows.length; i++) {
        // Some tables have an extra column; align to units properly
        var offset = (table.rows[1].cells.length == table.rows[i].cells.length) ? 2 : 1;
        for (var j = offset; j < troopCounter.unitImages.length + offset; j++) {
            troopSums[(i - 1) % 5][j - offset] += parseInt(table.rows[i].cells[j].textContent);
        }
    }
}

// Subtract one troop sum array from another
function subtractSums(sum1, sum2) {
    var result = [];
    for (var k = 0; k < troopCounter.unitImages.length; k++)
        result[k] = sum1[k] - sum2[k];
    return result;
}

// Add two troop sum arrays
function addSums(sum1, sum2) {
    var result = [];
    for (var k = 0; k < troopCounter.unitImages.length; k++)
        result[k] = sum1[k] + sum2[k];
    return result;
}

// Render fixed spaces (using figure space) for aligning numbers
function drawSpaces(value) {
    var text = String(value);
    var result = "";
    for (var j = 0; j < (10 - text.length); j++)
        result += "\u2007";
    return result;
}

// Render the final sum into HTML and prepare export BB-code
function renderResult(sumToRender) {
    var html = "<tr>";
    troopCounter.exportText = "<textarea rows='7' cols='25' onclick=\"this.select();\">";

    for (var i = 0; i < troopCounter.unitImages.length; i++) {
        // Prepare BB-code for export
        troopCounter.exportText += "[unit]" + troopCounter.unitImages[i] + "[/unit]" +
                                   sumToRender[i] +
                                   (i % 2 == 0 ? drawSpaces(sumToRender[i]) : "\n");

        // Build HTML with unit icon and sum
        html += (i % 2 == 0 ? "<tr>" : "") +
                "<th width='20'><a href='https://help.plemiona.pl/wiki/Jednostki#" +
                troopCounter.unitNames[i] +
                "' target='_blank'><img src='" + image_base + "unit/unit_" +
                troopCounter.unitImages[i] + ".png'></a></th>" +
                "<td>" + sumToRender[i] + "</td>";
    }

    troopCounter.exportText += "</textarea>";
    $("#available_troops").html(html);

    $(mobile ? '#loading' : '#loading_content').hide();
    $("#village_count").html("Súčet " + ((table.rows.length - 1) / 5) + " dedín");
}
