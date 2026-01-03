/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 100.0, "KoPercent": 0.0};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9796337732316545, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.9836956521739131, 500, 1500, "GET /hotels/locations?query=New"], "isController": false}, {"data": [0.856964656964657, 500, 1500, "GET /flights/prices-by-date"], "isController": false}, {"data": [1.0, 500, 1500, "GET /cars/search - Los Angeles"], "isController": false}, {"data": [0.5, 500, 1500, "Login - Get Auth Token"], "isController": false}, {"data": [0.993485342019544, 500, 1500, "GET /flights/airlines"], "isController": false}, {"data": [0.9992559523809523, 500, 1500, "GET /hotels/search - San Francisco"], "isController": false}, {"data": [1.0, 500, 1500, "GET /flights/locations?query=San"], "isController": false}, {"data": [0.9883158742949234, 500, 1500, "GET /flights/search - LAX to SFO"], "isController": false}, {"data": [1.0, 500, 1500, "GET /cars/locations?query=Los"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 21899, 0, 0.0, 160.6471528380295, 0, 2200, 87.0, 401.0, 486.0, 721.9800000000032, 60.525741197801075, 186.23228496143037, 11.05481122586115], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["GET /hotels/locations?query=New", 3312, 0, 0.0, 262.8614130434789, 151, 1546, 177.0, 483.7000000000003, 494.0, 523.7399999999998, 28.29100786715527, 61.030113650923816, 4.530981728724086], "isController": false}, {"data": ["GET /flights/prices-by-date", 2405, 0, 0.0, 407.8902286902278, 154, 2200, 389.0, 709.4000000000001, 813.0, 1117.94, 20.748140863053646, 87.95671824855064, 3.566086710837345], "isController": false}, {"data": ["GET /cars/search - Los Angeles", 2757, 0, 0.0, 84.30214000725444, 76, 335, 82.0, 90.0, 94.0, 114.0, 23.37054649950411, 80.40472198999313, 5.317712240609821], "isController": false}, {"data": ["Login - Get Auth Token", 1, 0, 0.0, 1230.0, 1230, 1230, 1230.0, 1230.0, 1230.0, 1230.0, 0.8130081300813008, 1.3481326219512195, 0.18578506097560976], "isController": false}, {"data": ["GET /flights/airlines", 2456, 0, 0.0, 126.91775244299671, 73, 1319, 82.0, 319.0, 415.0, 508.8599999999997, 20.937587914851534, 24.597576427310933, 3.148816932506969], "isController": false}, {"data": ["GET /hotels/search - San Francisco", 3360, 0, 0.0, 158.55654761904793, 77, 1192, 94.0, 370.9000000000001, 413.0, 430.0, 28.379337139768236, 202.39677649582757, 6.346550981452076], "isController": false}, {"data": ["GET /flights/locations?query=San", 2422, 0, 0.0, 3.658959537572255, 0, 125, 1.0, 8.0, 12.0, 44.76999999999998, 20.858811168334565, 20.064383789853075, 3.3610389089601598], "isController": false}, {"data": ["GET /flights/search - LAX to SFO", 2482, 0, 0.0, 142.62167606768776, 74, 1200, 83.0, 360.0, 428.5499999999997, 588.1700000000001, 20.843830830729953, 70.8771669459001, 4.1117713162182135], "isController": false}, {"data": ["GET /cars/locations?query=Los", 2704, 0, 0.0, 83.38720414201177, 75, 182, 82.0, 89.0, 94.0, 112.0, 23.35201609769157, 25.358829981086938, 3.6943619217051116], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": []}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 21899, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
