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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.9842535787321064, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.9895115373089601, 500, 1500, "GET /hotels/locations?query=New"], "isController": false}, {"data": [0.8811390837804375, 500, 1500, "GET /flights/prices-by-date"], "isController": false}, {"data": [1.0, 500, 1500, "GET /cars/search - Los Angeles"], "isController": false}, {"data": [0.5, 500, 1500, "Login - Get Auth Token"], "isController": false}, {"data": [0.9981803477557623, 500, 1500, "GET /flights/airlines"], "isController": false}, {"data": [0.9988127040664886, 500, 1500, "GET /hotels/search - San Francisco"], "isController": false}, {"data": [1.0, 500, 1500, "GET /flights/locations?query=San"], "isController": false}, {"data": [0.9941976790716287, 500, 1500, "GET /flights/search - LAX to SFO"], "isController": false}, {"data": [1.0, 500, 1500, "GET /cars/locations?query=Los"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 22005, 0, 0.0, 154.9578277664162, 0, 1615, 88.0, 374.0, 466.0, 643.0, 60.8165250700613, 187.009829461364, 11.104299355905876], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["GET /hotels/locations?query=New", 3337, 0, 0.0, 251.02007791429435, 152, 669, 173.0, 479.0, 491.0, 512.6199999999999, 28.500905332923374, 61.4829100394802, 4.564598119726009], "isController": false}, {"data": ["GET /flights/prices-by-date", 2423, 0, 0.0, 395.87205943045785, 155, 1615, 387.0, 642.0, 728.7999999999997, 1030.5599999999986, 20.933226204978013, 88.74134273028277, 3.597898253980596], "isController": false}, {"data": ["GET /cars/search - Los Angeles", 2754, 0, 0.0, 88.46259985475673, 76, 366, 84.0, 94.0, 103.25, 189.44999999999982, 23.3239608387818, 80.24444729983232, 5.307112183043125], "isController": false}, {"data": ["Login - Get Auth Token", 1, 0, 0.0, 1293.0, 1293, 1293, 1293.0, 1293.0, 1293.0, 1293.0, 0.7733952049497294, 1.2824463457076567, 0.1767328886310905], "isController": false}, {"data": ["GET /flights/airlines", 2473, 0, 0.0, 111.7743631217145, 74, 923, 83.0, 195.0, 293.8999999999992, 452.5199999999995, 21.0101524998938, 24.68282564196508, 3.1597299658043414], "isController": false}, {"data": ["GET /hotels/search - San Francisco", 3369, 0, 0.0, 156.14603739982167, 78, 1163, 93.0, 399.0, 412.0, 423.3000000000002, 28.463046196478658, 202.9937757547692, 6.36527107323595], "isController": false}, {"data": ["GET /flights/locations?query=San", 2447, 0, 0.0, 4.532897425418891, 0, 170, 2.0, 10.0, 15.0, 62.51999999999998, 20.997983438451968, 20.19825555358905, 3.383464128266186], "isController": false}, {"data": ["GET /flights/search - LAX to SFO", 2499, 0, 0.0, 127.92396958783509, 75, 1332, 84.0, 262.0, 359.0, 539.0, 20.997882566463886, 71.40100302385474, 4.1421604281501025], "isController": false}, {"data": ["GET /cars/locations?query=Los", 2702, 0, 0.0, 86.90895632864535, 74, 350, 83.0, 92.0, 101.0, 189.9399999999996, 23.33434086100436, 25.339635778746924, 3.6915656440260807], "isController": false}]}, function(index, item){
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
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 22005, 0, "", "", "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
