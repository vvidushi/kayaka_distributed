## JMeter quick start

1) Export your JMeter binary path:
   ```bash
   export JMETER_HOME=/Users/hiruzen/Programming/Projects/DATA-236-Projects/Lab2/tools/jmeter/bin
   ```

2) Run the Kayak flow test headless (results to `jmeter/results/jmeter-cache.jtl`):
   ```bash
   "$JMETER_HOME"/jmeter -n -t jmeter/kayak_cache_performance.jmx -l jmeter/results/jmeter-cache.jtl
   ```

3) Generate an HTML dashboard from the saved results (writes to `jmeter/results/report-latest`):
   ```bash
   mkdir -p jmeter/results/report-cache
   "$JMETER_HOME"/jmeter -g jmeter/results/jmeter-cache.jtl -o jmeter/results/report-cache
   ```

Notes:
- Ensure the backend and required services are running before executing the test.
- If you want to reuse an existing JTL in `jmeter/results/jmeter-cache.jtl`, swap the `-l` and `-g` paths accordingly.
