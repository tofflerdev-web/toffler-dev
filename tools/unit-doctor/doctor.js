/*
 * TOFFLER Unit Doctor — systemd unit file linter.
 *
 * Finds the mistakes `systemd-analyze verify` stays quiet about (shell syntax
 * in ExecStart=, a crash loop the rate limit can never stop, Python output
 * lost to buffering, user units that never start) plus the ones it only
 * mentions once in the journal (typos, invalid values, misplaced keys).
 * Every rule was checked against systemd 257's own behaviour.
 *
 * Pure function, no I/O: runs in the browser (window.TofflerUnitDoctor) and
 * under Node (module.exports), so the tests exercise exactly what ships.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.TofflerUnitDoctor = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Directive table generated from systemd.directives(7) by scripts/gen_keys.py.
  const KEYS = {"Unit":["After","AllowIsolate","AssertACPower","AssertArchitecture","AssertCPUFeature","AssertCPUPressure","AssertCPUs","AssertCapability","AssertControlGroupController","AssertCredential","AssertDirectoryNotEmpty","AssertEnvironment","AssertFileIsExecutable","AssertFileNotEmpty","AssertFirstBoot","AssertGroup","AssertHost","AssertIOPressure","AssertKernelCommandLine","AssertKernelVersion","AssertMemory","AssertMemoryPressure","AssertNeedsUpdate","AssertOSRelease","AssertPathExists","AssertPathExistsGlob","AssertPathIsDirectory","AssertPathIsEncrypted","AssertPathIsMountPoint","AssertPathIsReadWrite","AssertPathIsSymbolicLink","AssertSecurity","AssertUser","AssertVirtualization","Before","BindsTo","CollectMode","ConditionACPower","ConditionArchitecture","ConditionCPUFeature","ConditionCPUPressure","ConditionCPUs","ConditionCapability","ConditionControlGroupController","ConditionCredential","ConditionDirectoryNotEmpty","ConditionEnvironment","ConditionFileIsExecutable","ConditionFileNotEmpty","ConditionFirmware","ConditionFirstBoot","ConditionGroup","ConditionHost","ConditionIOPressure","ConditionKernelCommandLine","ConditionKernelVersion","ConditionMemory","ConditionMemoryPressure","ConditionNeedsUpdate","ConditionOSRelease","ConditionPathExists","ConditionPathExistsGlob","ConditionPathIsDirectory","ConditionPathIsEncrypted","ConditionPathIsMountPoint","ConditionPathIsReadWrite","ConditionPathIsSymbolicLink","ConditionSecurity","ConditionUser","ConditionVirtualization","Conflicts","DefaultDependencies","Description","Documentation","FailureAction","FailureActionExitStatus","IgnoreOnIsolate","JobRunningTimeoutSec","JobTimeoutAction","JobTimeoutRebootArgument","JobTimeoutSec","JoinsNamespaceOf","OnFailure","OnFailureJobMode","OnSuccess","OnSuccessJobMode","PartOf","PropagatesReloadTo","PropagatesStopTo","RebootArgument","RefuseManualStart","RefuseManualStop","ReloadPropagatedFrom","Requires","RequiresMountsFor","Requisite","SourcePath","StartLimitAction","StartLimitBurst","StartLimitIntervalSec","StopPropagatedFrom","StopWhenUnneeded","SuccessAction","SuccessActionExitStatus","SurviveFinalKillSignal","Upholds","Wants","WantsMountsFor"],"Service":["AllowedCPUs","AllowedMemoryNodes","AmbientCapabilities","AppArmorProfile","BPFProgram","BindLogSockets","BindPaths","BindReadOnlyPaths","BusName","CPUAccounting","CPUAffinity","CPUQuota","CPUQuotaPeriodSec","CPUSchedulingPolicy","CPUSchedulingPriority","CPUSchedulingResetOnFork","CPUWeight","CacheDirectory","CacheDirectoryMode","CapabilityBoundingSet","ConfigurationDirectory","ConfigurationDirectoryMode","CoredumpFilter","CoredumpReceive","DefaultStartupMemoryLow","Delegate","DelegateSubgroup","DeviceAllow","DevicePolicy","DisableControllers","DynamicUser","Environment","EnvironmentFile","ExecCondition","ExecPaths","ExecReload","ExecSearchPath","ExecStart","ExecStartPost","ExecStartPre","ExecStop","ExecStopPost","ExitType","ExtensionDirectories","ExtensionImagePolicy","ExtensionImages","FileDescriptorStoreMax","FileDescriptorStorePreserve","FinalKillSignal","Group","GuessMainPID","IOAccounting","IODeviceLatencyTargetSec","IODeviceWeight","IOReadBandwidthMax","IOReadIOPSMax","IOSchedulingClass","IOSchedulingPriority","IOWeight","IOWriteBandwidthMax","IOWriteIOPSMax","IPAccounting","IPAddressAllow","IPAddressDeny","IPCNamespacePath","IPEgressFilterPath","IPIngressFilterPath","IgnoreSIGPIPE","ImportCredential","InaccessiblePaths","KeyringMode","KillMode","KillSignal","LimitAS","LimitCORE","LimitCPU","LimitDATA","LimitFSIZE","LimitLOCKS","LimitMEMLOCK","LimitMSGQUEUE","LimitNICE","LimitNOFILE","LimitNPROC","LimitRSS","LimitRTPRIO","LimitRTTIME","LimitSIGPENDING","LimitSTACK","LoadCredential","LoadCredentialEncrypted","LockPersonality","LogExtraFields","LogFilterPatterns","LogLevelMax","LogNamespace","LogRateLimitBurst","LogRateLimitIntervalSec","LogsDirectory","LogsDirectoryMode","ManagedOOMMemoryPressure","ManagedOOMMemoryPressureDurationSec","ManagedOOMMemoryPressureLimit","ManagedOOMPreference","ManagedOOMSwap","MemoryAccounting","MemoryDenyWriteExecute","MemoryHigh","MemoryKSM","MemoryLow","MemoryMax","MemoryMin","MemoryPressureThresholdSec","MemoryPressureWatch","MemorySwapMax","MemoryZSwapMax","MemoryZSwapWriteback","MountAPIVFS","MountFlags","MountImagePolicy","MountImages","NFTSet","NUMAMask","NUMAPolicy","NetworkNamespacePath","Nice","NoExecPaths","NoNewPrivileges","NonBlocking","NotifyAccess","OOMPolicy","OOMScoreAdjust","OpenFile","PAMName","PIDFile","PassEnvironment","Personality","PrivateDevices","PrivateIPC","PrivateMounts","PrivateNetwork","PrivatePIDs","PrivateTmp","PrivateUsers","ProcSubset","ProtectClock","ProtectControlGroups","ProtectHome","ProtectHostname","ProtectKernelLogs","ProtectKernelModules","ProtectKernelTunables","ProtectProc","ProtectSystem","ReadOnlyPaths","ReadWritePaths","ReloadSignal","RemainAfterExit","RemoveIPC","Restart","RestartForceExitStatus","RestartKillSignal","RestartMaxDelaySec","RestartMode","RestartPreventExitStatus","RestartSec","RestartSteps","RestrictAddressFamilies","RestrictFileSystems","RestrictNamespaces","RestrictNetworkInterfaces","RestrictRealtime","RestrictSUIDSGID","RootDirectory","RootDirectoryStartOnly","RootEphemeral","RootHash","RootHashSignature","RootImage","RootImageOptions","RootImagePolicy","RootVerity","RuntimeDirectory","RuntimeDirectoryMode","RuntimeDirectoryPreserve","RuntimeMaxSec","RuntimeRandomizedExtraSec","SELinuxContext","SecureBits","SendSIGHUP","SendSIGKILL","SetCredential","SetCredentialEncrypted","SetLoginEnvironment","Slice","SmackProcessLabel","SocketBindAllow","SocketBindDeny","Sockets","StandardError","StandardInput","StandardInputData","StandardInputText","StandardOutput","StartupAllowedCPUs","StartupAllowedMemoryNodes","StartupCPUWeight","StartupIOWeight","StartupMemoryHigh","StartupMemoryLow","StartupMemoryMax","StartupMemorySwapMax","StartupMemoryZSwapMax","StateDirectory","StateDirectoryMode","SuccessExitStatus","SupplementaryGroups","SyslogFacility","SyslogIdentifier","SyslogLevel","SyslogLevelPrefix","SystemCallArchitectures","SystemCallErrorNumber","SystemCallFilter","SystemCallLog","TTYColumns","TTYPath","TTYReset","TTYRows","TTYVHangup","TTYVTDisallocate","TasksAccounting","TasksMax","TemporaryFileSystem","TimeoutAbortSec","TimeoutCleanSec","TimeoutSec","TimeoutStartFailureMode","TimeoutStartSec","TimeoutStopFailureMode","TimeoutStopSec","TimerSlackNSec","Type","UMask","USBFunctionDescriptors","USBFunctionStrings","UnsetEnvironment","User","UtmpIdentifier","UtmpMode","WatchdogSec","WatchdogSignal","WorkingDirectory","Writable"],"Socket":["Accept","AllowedCPUs","AllowedMemoryNodes","AmbientCapabilities","AppArmorProfile","BPFProgram","Backlog","BindIPv6Only","BindLogSockets","BindPaths","BindReadOnlyPaths","BindToDevice","Broadcast","CPUAccounting","CPUAffinity","CPUQuota","CPUQuotaPeriodSec","CPUSchedulingPolicy","CPUSchedulingPriority","CPUSchedulingResetOnFork","CPUWeight","CacheDirectory","CacheDirectoryMode","CapabilityBoundingSet","ConfigurationDirectory","ConfigurationDirectoryMode","CoredumpFilter","CoredumpReceive","DefaultStartupMemoryLow","DeferAcceptSec","Delegate","DelegateSubgroup","DeviceAllow","DevicePolicy","DirectoryMode","DisableControllers","DynamicUser","Environment","EnvironmentFile","ExecPaths","ExecSearchPath","ExecStartPost","ExecStartPre","ExecStopPost","ExecStopPre","ExtensionDirectories","ExtensionImagePolicy","ExtensionImages","FileDescriptorName","FinalKillSignal","FlushPending","FreeBind","Group","IOAccounting","IODeviceLatencyTargetSec","IODeviceWeight","IOReadBandwidthMax","IOReadIOPSMax","IOSchedulingClass","IOSchedulingPriority","IOWeight","IOWriteBandwidthMax","IOWriteIOPSMax","IPAccounting","IPAddressAllow","IPAddressDeny","IPCNamespacePath","IPEgressFilterPath","IPIngressFilterPath","IPTOS","IPTTL","IgnoreSIGPIPE","ImportCredential","InaccessiblePaths","KeepAlive","KeepAliveIntervalSec","KeepAliveProbes","KeepAliveTimeSec","KeyringMode","KillMode","KillSignal","LimitAS","LimitCORE","LimitCPU","LimitDATA","LimitFSIZE","LimitLOCKS","LimitMEMLOCK","LimitMSGQUEUE","LimitNICE","LimitNOFILE","LimitNPROC","LimitRSS","LimitRTPRIO","LimitRTTIME","LimitSIGPENDING","LimitSTACK","ListenDatagram","ListenFIFO","ListenMessageQueue","ListenNetlink","ListenSequentialPacket","ListenSpecial","ListenStream","ListenUSBFunction","LoadCredential","LoadCredentialEncrypted","LockPersonality","LogExtraFields","LogFilterPatterns","LogLevelMax","LogNamespace","LogRateLimitBurst","LogRateLimitIntervalSec","LogsDirectory","LogsDirectoryMode","ManagedOOMMemoryPressure","ManagedOOMMemoryPressureDurationSec","ManagedOOMMemoryPressureLimit","ManagedOOMPreference","ManagedOOMSwap","Mark","MaxConnections","MaxConnectionsPerSource","MemoryAccounting","MemoryDenyWriteExecute","MemoryHigh","MemoryKSM","MemoryLow","MemoryMax","MemoryMin","MemoryPressureThresholdSec","MemoryPressureWatch","MemorySwapMax","MemoryZSwapMax","MemoryZSwapWriteback","MessageQueueMaxMessages","MessageQueueMessageSize","MountAPIVFS","MountFlags","MountImagePolicy","MountImages","NFTSet","NUMAMask","NUMAPolicy","NetworkNamespacePath","Nice","NoDelay","NoExecPaths","NoNewPrivileges","OOMScoreAdjust","PAMName","PassCredentials","PassEnvironment","PassFileDescriptorsToExec","PassPacketInfo","PassSecurity","Personality","PipeSize","PollLimitBurst","PollLimitIntervalSec","Priority","PrivateDevices","PrivateIPC","PrivateMounts","PrivateNetwork","PrivatePIDs","PrivateTmp","PrivateUsers","ProcSubset","ProtectClock","ProtectControlGroups","ProtectHome","ProtectHostname","ProtectKernelLogs","ProtectKernelModules","ProtectKernelTunables","ProtectProc","ProtectSystem","ReadOnlyPaths","ReadWritePaths","ReceiveBuffer","RemoveIPC","RemoveOnStop","RestartKillSignal","RestrictAddressFamilies","RestrictFileSystems","RestrictNamespaces","RestrictNetworkInterfaces","RestrictRealtime","RestrictSUIDSGID","ReusePort","RootDirectory","RootEphemeral","RootHash","RootHashSignature","RootImage","RootImageOptions","RootImagePolicy","RootVerity","RuntimeDirectory","RuntimeDirectoryMode","RuntimeDirectoryPreserve","SELinuxContext","SELinuxContextFromNet","SecureBits","SendBuffer","SendSIGHUP","SendSIGKILL","Service","SetCredential","SetCredentialEncrypted","SetLoginEnvironment","Slice","SmackLabel","SmackLabelIPIn","SmackLabelIPOut","SmackProcessLabel","SocketBindAllow","SocketBindDeny","SocketGroup","SocketMode","SocketProtocol","SocketUser","StandardError","StandardInput","StandardInputData","StandardInputText","StandardOutput","StartupAllowedCPUs","StartupAllowedMemoryNodes","StartupCPUWeight","StartupIOWeight","StartupMemoryHigh","StartupMemoryLow","StartupMemoryMax","StartupMemorySwapMax","StartupMemoryZSwapMax","StateDirectory","StateDirectoryMode","SupplementaryGroups","Symlinks","SyslogFacility","SyslogIdentifier","SyslogLevel","SyslogLevelPrefix","SystemCallArchitectures","SystemCallErrorNumber","SystemCallFilter","SystemCallLog","TCPCongestion","TTYColumns","TTYPath","TTYReset","TTYRows","TTYVHangup","TTYVTDisallocate","TasksAccounting","TasksMax","TemporaryFileSystem","TimeoutCleanSec","TimeoutSec","TimerSlackNSec","Timestamping","Transparent","TriggerLimitBurst","TriggerLimitIntervalSec","UMask","UnsetEnvironment","User","UtmpIdentifier","UtmpMode","WatchdogSignal","WorkingDirectory","Writable"],"Timer":["AccuracySec","DeferReactivation","FixedRandomDelay","OnActiveSec","OnBootSec","OnCalendar","OnClockChange","OnStartupSec","OnTimezoneChange","OnUnitActiveSec","OnUnitInactiveSec","Persistent","RandomizedDelaySec","RemainAfterElapse","Unit","WakeSystem"],"Path":["DirectoryMode","DirectoryNotEmpty","MakeDirectory","PathChanged","PathExists","PathExistsGlob","PathModified","TriggerLimitBurst","TriggerLimitIntervalSec","Unit"],"Install":["Alias","Also","DefaultInstance","RequiredBy","UpheldBy","WantedBy"],"_source":"systemd.directives(7) v257"};
  const KEYSET = {};
  for (const s of Object.keys(KEYS)) if (Array.isArray(KEYS[s])) KEYSET[s] = new Set(KEYS[s]);

  const TYPE_SECTIONS = ["Service", "Socket", "Timer", "Path", "Mount", "Automount", "Swap", "Slice", "Scope"];
  const KNOWN_SECTIONS = new Set(["Unit", "Install"].concat(TYPE_SECTIONS));

  // Legacy spellings systemd 257 still accepts inside [Service] (verified).
  const LEGACY_IN_SERVICE = new Set(["StartLimitBurst", "StartLimitInterval", "StartLimitAction"]);
  const DEPRECATED = {
    MemoryLimit: "MemoryMax", CPUShares: "CPUWeight", StartupCPUShares: "StartupCPUWeight",
    BlockIOWeight: "IOWeight", StartupBlockIOWeight: "StartupIOWeight",
    BlockIOReadBandwidth: "IOReadBandwidthMax", BlockIOWriteBandwidth: "IOWriteBandwidthMax",
    BlockIODeviceWeight: "IODeviceWeight", StartLimitInterval: "StartLimitIntervalSec",
  };

  const BOOL = /^(1|yes|y|true|t|on|0|no|n|false|f|off)$/i;
  const BOOL_KEYS = new Set([
    "RemainAfterExit", "NoNewPrivileges", "PrivateTmp", "PrivateDevices", "PrivateNetwork",
    "PrivateUsers", "ProtectKernelTunables", "ProtectKernelModules", "ProtectKernelLogs",
    "ProtectControlGroups", "ProtectClock", "ProtectHostname", "DynamicUser", "Persistent",
    "GuessMainPID", "RestrictRealtime", "RestrictSUIDSGID", "LockPersonality",
    "MemoryDenyWriteExecute", "DefaultDependencies", "IgnoreOnIsolate", "StopWhenUnneeded",
    "RefuseManualStart", "RefuseManualStop", "AllowIsolate", "SendSIGKILL", "SendSIGHUP",
    "TTYReset", "WakeSystem", "RemainAfterElapse", "Accept",
  ]);
  const ENUMS = {
    Restart: { values: ["no", "on-success", "on-failure", "on-abnormal", "on-watchdog", "on-abort", "always"], dflt: "no", why: "the service will never be restarted" },
    Type: { values: ["simple", "exec", "forking", "oneshot", "dbus", "notify", "notify-reload", "idle"], dflt: "simple" },
    KillMode: { values: ["control-group", "mixed", "process", "none"], dflt: "control-group" },
    NotifyAccess: { values: ["none", "main", "exec", "all"], dflt: "none" },
    ExitType: { values: ["main", "cgroup"], dflt: "main" },
    ProtectSystem: { values: ["yes", "no", "true", "false", "on", "off", "1", "0", "full", "strict"], dflt: "no" },
    ProtectHome: { values: ["yes", "no", "true", "false", "on", "off", "1", "0", "read-only", "tmpfs"], dflt: "no" },
  };
  const OUTPUT_VALUES = ["inherit", "null", "tty", "journal", "kmsg", "journal+console", "kmsg+console", "socket"];
  const TIMESPAN_KEYS = new Set([
    "RestartSec", "RestartMaxDelaySec", "TimeoutSec", "TimeoutStartSec", "TimeoutStopSec",
    "TimeoutAbortSec", "RuntimeMaxSec", "WatchdogSec", "StartLimitIntervalSec", "JobTimeoutSec",
    "OnBootSec", "OnStartupSec", "OnActiveSec", "OnUnitActiveSec", "OnUnitInactiveSec",
    "AccuracySec", "RandomizedDelaySec",
  ]);
  const EXEC_KEYS = ["ExecStart", "ExecStartPre", "ExecStartPost", "ExecReload", "ExecStop", "ExecStopPost", "ExecCondition"];
  const RESTARTS_ON_FAILURE = new Set(["always", "on-failure", "on-abnormal", "on-abort", "on-watchdog"]);
  const TIMER_TRIGGERS = ["OnCalendar", "OnBootSec", "OnStartupSec", "OnActiveSec", "OnUnitActiveSec", "OnUnitInactiveSec", "OnClockChange", "OnTimezoneChange"];

  // ---------- parsing ----------

  function parse(text) {
    const lines = String(text == null ? "" : text).replace(/\r\n?/g, "\n").split("\n");
    const entries = [], sections = [], junk = [];
    let sec = null;
    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      let t = lines[i].trim();
      if (!t || t[0] === "#" || t[0] === ";") continue;
      if (t[0] === "[") {
        const m = t.match(/^\[([^\]]+)\]$/);
        if (m) { sec = { name: m[1], line: lineNo }; sections.push(sec); }
        else junk.push({ line: lineNo, text: t });
        continue;
      }
      while (t.endsWith("\\") && i + 1 < lines.length) {
        i++;
        const next = lines[i].trim();
        if (next[0] === "#" || next[0] === ";") continue;
        t = t.slice(0, -1).trimEnd() + " " + next;
      }
      const eq = t.indexOf("=");
      if (eq < 0) { junk.push({ line: lineNo, text: t, section: sec && sec.name }); continue; }
      entries.push({ section: sec ? sec.name : null, key: t.slice(0, eq).trim(), value: t.slice(eq + 1).trim(), line: lineNo, endLine: i + 1 });
    }
    return { lines, entries, sections, junk };
  }

  function inSection(p, section, key) { return p.entries.filter((e) => e.section === section && e.key === key); }
  function last(p, section, key) { const a = inSection(p, section, key); return a.length ? a[a.length - 1] : null; }
  // list semantics: an empty assignment resets everything before it
  function listValues(p, section, key) {
    let out = [];
    for (const e of inSection(p, section, key)) { if (e.value === "") out = []; else out.push(e); }
    return out;
  }

  // shell-like word split honouring "…" and '…' (enough for ExecStart=/Environment=)
  function words(s) {
    const out = [];
    let cur = "", q = null, any = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === q) q = null; else if (c === "\\" && q === '"' && i + 1 < s.length) cur += s[++i]; else cur += c; continue; }
      if (c === '"' || c === "'") { q = c; any = true; continue; }
      if (/\s/.test(c)) { if (cur || any) out.push(cur); cur = ""; any = false; continue; }
      cur += c;
    }
    if (cur || any) out.push(cur);
    return out;
  }
  function unquoted(s) { return s.replace(/"(?:\\.|[^"\\])*"|'[^']*'/g, " "); }

  function execCmd(value) {
    const v = value.replace(/^[@\-:+!]+/, "");
    const w = words(v);
    return { raw: v, words: w, exe: w[0] || "", base: (w[0] || "").split("/").pop() };
  }
  // for `sh -c '…'`, the first command of the script is what really runs
  function innerCmd(c) {
    if (!/^(sh|bash|dash|zsh|ash)$/.test(c.base)) return c;
    const i = c.words.indexOf("-c");
    if (i < 0 || i + 1 >= c.words.length) return c;
    const first = c.words[i + 1].split(/\|\||&&|;|\||\d?>>?|&>|</)[0].replace(/^\s*(exec\s+)?/, "");
    return execCmd(first);
  }

  const UNITS = {
    us: 1e-6, usec: 1e-6, "µs": 1e-6, ms: 1e-3, msec: 1e-3, s: 1, sec: 1, second: 1, seconds: 1,
    m: 60, min: 60, minute: 60, minutes: 60, h: 3600, hr: 3600, hour: 3600, hours: 3600,
    d: 86400, day: 86400, days: 86400, w: 604800, week: 604800, weeks: 604800,
    M: 2629800, month: 2629800, months: 2629800, y: 31557600, year: 31557600, years: 31557600,
  };
  function timespan(v) {
    v = String(v).trim();
    if (/^infinity$/i.test(v)) return Infinity;
    if (/^\d+(\.\d+)?$/.test(v)) return +v;
    const re = /(\d+(?:\.\d+)?)\s*([A-Za-zµ]+)\s*/y;
    let pos = 0, total = 0;
    if (!v) return NaN;
    while (pos < v.length) {
      re.lastIndex = pos;
      const m = re.exec(v);
      if (!m) return NaN;
      const u = UNITS[m[2]] !== undefined ? UNITS[m[2]] : (m[2] !== "M" ? UNITS[m[2].toLowerCase()] : undefined);
      if (u === undefined) return NaN;
      total += +m[1] * u;
      pos = re.lastIndex;
    }
    return total;
  }
  function fmtSec(s) { return s >= 1 ? (Math.round(s * 10) / 10) + "s" : Math.round(s * 1000) + "ms"; }

  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 99;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function nearest(word, candidates, max) {
    let best = null, bd = max + 1;
    const lw = word.toLowerCase();
    for (const c of candidates) {
      if (c.toLowerCase() === lw) return c;
      const d = lev(lw, c.toLowerCase());
      if (d < bd) { bd = d; best = c; }
    }
    return bd <= max ? best : null;
  }

  // Environment= value -> assignments, and a correctly quoted rewrite if needed
  function envAssignments(value) {
    const w = words(value);
    const groups = [];
    for (const t of w) {
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(t) || !groups.length) groups.push([t]);
      else groups[groups.length - 1].push(t);
    }
    return groups.map((g) => g.join(" "));
  }

  // ---------- rules ----------

  function analyze(text, opts) {
    const o = Object.assign({ user: false }, opts || {});
    const p = parse(text);
    const F = [];
    const add = (sev, id, line, title, detail, fix, patch) => F.push({ sev, id, line, title, detail, fix: fix || null, patch: patch || null });
    const typeSecs = p.sections.filter((s) => TYPE_SECTIONS.includes(s.name)).map((s) => s.name);
    const kind = typeSecs[0] || null;
    const svc = kind === "Service";

    if (!p.entries.length && !p.sections.length) return result(p, F, o, kind);

    // structure
    for (const j of p.junk) add("error", "syntax", j.line, "Line is not Key=Value", "systemd cannot parse `" + j.text + "` and skips it.");
    if (p.entries.some((e) => e.section === null)) {
      const e = p.entries.find((x) => x.section === null);
      add("error", "no-section", e.line, "Setting outside any [Section]", "Every setting must sit under a section header such as [Unit] or [Service]; systemd ignores this one.");
    }
    const distinctTypes = [...new Set(typeSecs)];
    if (distinctTypes.length > 1) {
      const s2 = p.sections.find((s) => s.name === distinctTypes[1]);
      add("error", "two-types", s2.line, "[" + distinctTypes.join("] and [") + "] in one file",
        "A unit file has exactly one type, taken from its file name. In a ." + distinctTypes[0].toLowerCase() + " file systemd ignores the whole [" + distinctTypes[1] + "] section. Put it in its own ." + distinctTypes[1].toLowerCase() + " file.");
    }
    for (const s of p.sections) {
      if (KNOWN_SECTIONS.has(s.name) || /^X-/.test(s.name)) continue;
      const near = nearest(s.name, [...KNOWN_SECTIONS], 2);
      add("error", "unknown-section", s.line, "Unknown section [" + s.name + "]",
        "systemd ignores the whole section and every setting in it." + (near ? " Did you mean [" + near + "]?" : ""),
        near ? "[" + near + "]" : null, near ? [{ op: "replace", line: s.line, text: "[" + near + "]" }] : null);
    }

    // keys: unknown, misplaced, deprecated, legacy
    for (const e of p.entries) {
      if (!e.section || !KEYSET[e.section] || /^X-/.test(e.key)) continue;
      const known = KEYSET[e.section].has(e.key);
      if (e.section === "Service" && e.key === "StartLimitIntervalSec") {
        add("error", "startlimit-ignored", e.line, "StartLimitIntervalSec= is ignored in [Service]",
          "systemd 257 drops this line (\"Unknown key\"), so the rate-limit window silently stays at the default 10s. The trap: the old spelling StartLimitInterval= IS still accepted in [Service], so renaming it to the documented name breaks it. The key belongs in [Unit].",
          "[Unit]\nStartLimitIntervalSec=" + e.value,
          [{ op: "remove", line: e.line, endLine: e.endLine }, { op: "set", section: "Unit", key: "StartLimitIntervalSec", value: e.value }]);
        continue;
      }
      if (e.section === "Service" && LEGACY_IN_SERVICE.has(e.key)) {
        const k = e.key === "StartLimitInterval" ? "StartLimitIntervalSec" : e.key;
        add("info", "legacy-location", e.line, e.key + "= works here, but belongs in [Unit]",
          "systemd still accepts this legacy placement. Move it to [Unit]" + (k !== e.key ? " as " + k + "=" : "") + ", but never rename it while it stays in [Service]: StartLimitIntervalSec= is ignored there.",
          "[Unit]\n" + k + "=" + e.value,
          [{ op: "remove", line: e.line, endLine: e.endLine }, { op: "set", section: "Unit", key: k, value: e.value }]);
        continue;
      }
      if (e.section === "Unit" && e.key === "StartLimitInterval") {
        add("info", "legacy-name", e.line, "StartLimitInterval= is the legacy name",
          "Still accepted in [Unit]; the documented spelling is StartLimitIntervalSec=.",
          "StartLimitIntervalSec=" + e.value,
          [{ op: "replace", line: e.line, endLine: e.endLine, text: "StartLimitIntervalSec=" + e.value }]);
        continue;
      }
      if (DEPRECATED[e.key] && e.key !== "StartLimitInterval") {
        add("warn", "deprecated", e.line, e.key + "= is deprecated",
          "systemd warns that support \"will be removed soon\". Use " + DEPRECATED[e.key] + "= (note: the value scale can differ, e.g. CPUShares=1024 ≈ CPUWeight=100).",
          DEPRECATED[e.key] + "=…");
        continue;
      }
      if (e.key === "PermissionsStartOnly") {
        add("warn", "deprecated", e.line, "PermissionsStartOnly= is deprecated",
          "Prefix the specific ExecStartPre= commands that need privileges with + instead (e.g. ExecStartPre=+/usr/bin/mkdir -p /run/app).");
        continue;
      }
      if (known) continue;
      const home = Object.keys(KEYSET).find((s) => s !== e.section && KEYSET[s].has(e.key));
      if (home) {
        add("error", "wrong-section", e.line, e.key + "= belongs in [" + home + "]",
          "systemd ignores it in [" + e.section + "] (\"Unknown key\"), so it has no effect at all.",
          "[" + home + "]\n" + e.key + "=" + e.value,
          [{ op: "remove", line: e.line, endLine: e.endLine }, { op: "add", section: home, key: e.key, value: e.value }]);
        continue;
      }
      const near = nearest(e.key, KEYSET[e.section], 2);
      add("error", "unknown-key", e.line, "Unknown key " + e.key + "= in [" + e.section + "]",
        "systemd ignores the line. Keys are case-sensitive." + (near ? " Did you mean " + near + "=?" : ""),
        near ? near + "=" + e.value : null,
        near ? [{ op: "replace", line: e.line, endLine: e.endLine, text: near + "=" + e.value }] : null);
    }

    // values
    for (const e of p.entries) {
      if (!e.section || e.value === "") continue;
      const en = ENUMS[e.key];
      if (en && (e.section === "Service" || e.key.startsWith("Protect")) && !en.values.includes(e.value)) {
        const near = nearest(e.value, en.values, 3);
        add("error", "bad-value", e.line, "Invalid " + e.key + "=" + e.value,
          "systemd ignores the line and falls back to " + e.key + "=" + en.dflt + (en.why ? " — " + en.why : "") + ". Valid: " + en.values.filter((v) => !/^(true|false|on|off|1|0)$/.test(v)).join(", ") + ".",
          near ? e.key + "=" + near : null,
          near ? [{ op: "replace", line: e.line, endLine: e.endLine, text: e.key + "=" + near }] : null);
      }
      if (BOOL_KEYS.has(e.key) && !BOOL.test(e.value)) {
        add("error", "bad-value", e.line, e.key + "= needs a boolean", "`" + e.value + "` is not yes/no/true/false/on/off/1/0, so systemd ignores the line.");
      }
      if (TIMESPAN_KEYS.has(e.key) && Number.isNaN(timespan(e.value))) {
        add("error", "bad-timespan", e.line, "Unparsable time " + e.key + "=" + e.value,
          "systemd ignores the line. Use a number of seconds or units like 500ms, 5s, 2min, 1h 30min.");
      }
      if ((e.key === "StandardOutput" || e.key === "StandardError") && !OUTPUT_VALUES.includes(e.value)) {
        const m = e.value.match(/^(file|append|truncate):(.*)$/);
        if (m && !m[2].startsWith("/") && !/^%[hStLECTV]/.test(m[2])) {
          add("error", "relative-log", e.line, e.key + "= file path is not absolute",
            "systemd rejects `" + m[2] + "` — it must be an absolute path (or start with a specifier like %h).");
        } else if (!m && !/^fd:/.test(e.value)) {
          add("error", "bad-value", e.line, "Invalid " + e.key + "=" + e.value, "Valid: " + OUTPUT_VALUES.join(", ") + ", file:/path, append:/path, truncate:/path.");
        }
      }
      if (e.key === "KillMode" && e.value === "none") {
        add("warn", "killmode-none", e.line, "KillMode=none is unsafe and deprecated",
          "It disables systemd's process lifecycle management; stray processes survive stop/restart. systemd recommends mixed or control-group.", "KillMode=mixed");
      }
      if (e.key === "PIDFile" && !e.value.startsWith("/") && !e.value.startsWith("%")) {
        add("warn", "relative-pidfile", e.line, "PIDFile= is not absolute", "Paths are resolved relative to /run; write the full path (e.g. /run/app.pid) so it matches what the daemon writes.");
      }
      if (e.key === "Environment") {
        const w = words(e.value);
        const bad = w.filter((t) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(t));
        if (bad.length) {
          const fixed = envAssignments(e.value).map((a) => (/\s/.test(a) ? '"' + a + '"' : a)).join(" ");
          add("warn", "env-quoting", e.line, "Environment= value with an unquoted space",
            "systemd splits on spaces, so `" + bad.join(" ") + "` is dropped (\"Invalid environment assignment, ignoring\"). Quote the whole assignment.",
            "Environment=" + fixed, [{ op: "replace", line: e.line, endLine: e.endLine, text: "Environment=" + fixed }]);
        }
      }
      if (/^(EnvironmentFile|WorkingDirectory|PIDFile|ReadWritePaths|ReadOnlyPaths)$/.test(e.key)) {
        const v = e.value.replace(/^-/, "");
        if (v.startsWith("~") && !(e.key === "WorkingDirectory" && v === "~")) {
          add("error", "tilde", e.line, "~ is not expanded in " + e.key + "=", "systemd has no shell and does not expand ~. Use %h (the service manager's home) or an absolute path.",
            e.key + "=" + e.value.replace("~", "%h"), [{ op: "replace", line: e.line, endLine: e.endLine, text: e.key + "=" + e.value.replace("~", "%h") }]);
        }
      }
    }

    // service semantics
    if (svc) {
      const type = (last(p, "Service", "Type") || {}).value || "simple";
      const restartE = last(p, "Service", "Restart");
      const restart = restartE && ENUMS.Restart.values.includes(restartE.value) ? restartE.value : "no";
      const execs = listValues(p, "Service", "ExecStart");

      if (!execs.length && !listValues(p, "Service", "ExecStop").length && !last(p, "Service", "SuccessAction")) {
        const s = p.sections.find((x) => x.name === "Service");
        add("error", "no-execstart", s.line, "No ExecStart=", "systemd refuses to load a service with nothing to run.");
      }
      if (execs.length > 1 && type !== "oneshot") {
        add("error", "multi-exec", execs[1].line, "More than one ExecStart=",
          "Only Type=oneshot services may have several; systemd refuses to load this unit (\"bad unit file setting\"). Chain steps with ExecStartPre=/ExecStartPost=, or use a script.");
      }
      if (type === "oneshot" && (restart === "always" || restart === "on-success")) {
        add("error", "oneshot-restart", restartE.line, "Restart=" + restart + " is not allowed with Type=oneshot",
          "systemd refuses to load this unit. Use Restart=on-failure, or schedule reruns with a .timer.",
          "Restart=on-failure", [{ op: "replace", line: restartE.line, endLine: restartE.endLine, text: "Restart=on-failure" }]);
      }

      for (const key of EXEC_KEYS) {
        for (const e of listValues(p, "Service", key)) execChecks(e, key);
      }
      pythonCheck(execs);
      crashLoopCheck(restart, restartE);
      if (type === "forking" && !last(p, "Service", "PIDFile")) {
        const t = last(p, "Service", "Type");
        add("info", "forking-no-pidfile", t.line, "Type=forking without PIDFile=",
          "systemd has to guess the main PID. If the program can stay in the foreground, prefer Type=exec (or simple) with its --foreground / --no-daemon flag.");
      }
      if (["simple", "exec", "idle"].includes(type)) {
        for (const e of execs) {
          const c = execCmd(e.value);
          const f = c.words.find((w) => /^(--daemon|--daemonize|-daemon|--fork|--background)$/.test(w));
          if (f) add("warn", "daemonizes", e.line, "Type=" + type + " but the command forks away (" + f + ")",
            "systemd sees the main process exit, marks the service dead and kills the rest. Drop " + f + " or use Type=forking with PIDFile=.");
        }
      }
      if (o.user) {
        for (const k of ["User", "Group"]) {
          const e = last(p, "Service", k);
          if (e) add("error", "user-in-user-unit", e.line, k + "= in a user unit",
            "The per-user service manager cannot switch identity; the service fails to start. Remove it — a user unit already runs as you.",
            null, [{ op: "remove", line: e.line, endLine: e.endLine }]);
        }
      } else if (!last(p, "Service", "User") && !/^(yes|true|on|1)$/i.test((last(p, "Service", "DynamicUser") || {}).value || "")) {
        const s = p.sections.find((x) => x.name === "Service");
        const hard = ["NoNewPrivileges", "ProtectSystem", "PrivateTmp", "ProtectHome"].filter((k) => last(p, "Service", k));
        add("info", "runs-as-root", s.line, "Runs as root" + (hard.length ? "" : " with no sandboxing"),
          "Without User= (or DynamicUser=yes) the service has full root. Give it its own user, and add hardening such as NoNewPrivileges=yes, ProtectSystem=strict, PrivateTmp=yes. `systemd-analyze security " + "<unit>` scores it.",
          "User=appuser\nNoNewPrivileges=yes\nProtectSystem=strict\nPrivateTmp=yes");
      }
    }

    // ordering / install
    const wants = listValues(p, "Unit", "Wants").concat(listValues(p, "Unit", "Requires")).some((e) => /\bnetwork-online\.target\b/.test(e.value));
    const afterE = listValues(p, "Unit", "After").find((e) => /\bnetwork-online\.target\b/.test(e.value));
    const wantsE = listValues(p, "Unit", "Wants").concat(listValues(p, "Unit", "Requires")).find((e) => /\bnetwork-online\.target\b/.test(e.value));
    if (afterE && !wants) {
      add("warn", "network-online", afterE.line, "After=network-online.target without Wants=",
        "After= only orders; it does not pull the target in. If nothing else wants network-online.target, it never activates and your service starts before the network is up.",
        "Wants=network-online.target", [{ op: "add", section: "Unit", key: "Wants", value: "network-online.target" }]);
    } else if (wantsE && !afterE) {
      add("warn", "network-online", wantsE.line, "Wants=network-online.target without After=",
        "Wants= pulls the target in but does not order against it, so the service can still start before the network is up.",
        "After=network-online.target", [{ op: "add", section: "Unit", key: "After", value: "network-online.target" }]);
    }
    if (kind === "Timer") {
      if (!TIMER_TRIGGERS.some((k) => last(p, "Timer", k))) {
        const s = p.sections.find((x) => x.name === "Timer");
        add("error", "timer-no-trigger", s.line, "Timer with no trigger", "Add OnCalendar= (e.g. daily, *-*-* 03:00:00) or OnBootSec=/OnUnitActiveSec=.");
      } else if (last(p, "Timer", "OnCalendar") && !last(p, "Timer", "Persistent")) {
        const e = last(p, "Timer", "OnCalendar");
        add("info", "timer-persistent", e.line, "OnCalendar= without Persistent=true",
          "If the machine is off at the scheduled time, the run is skipped. Persistent=true catches up at next boot.", "Persistent=true",
          [{ op: "set", section: "Timer", key: "Persistent", value: "true" }]);
      }
    }
    const inst = ["WantedBy", "RequiredBy", "UpheldBy", "Alias"].some((k) => listValues(p, "Install", k).length);
    if (kind && kind !== "Slice" && kind !== "Scope" && !inst) {
      const s = p.sections.find((x) => x.name === kind);
      add("info", "no-install", s.line, "No [Install] target",
        "`systemctl enable` has nothing to hook into, so it will not start at boot. Fine if a timer, socket or another unit starts it.",
        "[Install]\nWantedBy=" + (kind === "Timer" ? "timers.target" : o.user ? "default.target" : "multi-user.target"));
    }
    if (o.user) {
      for (const e of listValues(p, "Install", "WantedBy")) {
        const m = e.value.match(/\b(multi-user|graphical)\.target\b/);
        if (m) add("error", "user-wantedby", e.line, "WantedBy=" + m[0] + " in a user unit",
          "That target only exists in the system manager, so `systemctl --user enable` links it to nothing and the service never starts at login. systemd does not warn about this.",
          "WantedBy=default.target", [{ op: "replace", line: e.line, endLine: e.endLine, text: e.value === m[0] ? "WantedBy=default.target" : "WantedBy=" + e.value.replace(m[0], "default.target") }]);
      }
    }

    return result(p, F, o, kind);

    // --- helpers that close over p / add / o ---

    function execChecks(e, key) {
      const c = execCmd(e.value);
      if (!c.exe) return;
      const isShell = /^(sh|bash|dash|zsh|ash)$/.test(c.base) && c.words.includes("-c");
      if (c.exe.startsWith("~")) {
        const home = o.user ? "%h" : (last(p, "Service", "User") ? "/home/" + last(p, "Service", "User").value : "/root");
        const fixed = e.value.replace(/~(?=\/)/g, home);
        add("error", "tilde", e.line, "~ in the " + key + "= executable",
          "systemd reports \"Neither a valid executable name nor an absolute path\" and the unit will not start at all. There is no shell to expand ~." + (o.user ? " In a user unit %h is your home." : ""),
          key + "=" + fixed, [{ op: "replace", line: e.line, endLine: e.endLine, text: key + "=" + fixed }]);
        return;
      }
      if (!isShell) {
        const u = unquoted(c.raw);
        const m = u.match(/(\|\||&&|(^|\s)\|(\s|$)|\d?>>?|&>|(^|\s)<(\s|$)|\$\(|`|\s&\s*$)/);
        if (m) {
          const inner = c.raw.includes("'") ? '"' + c.raw.replace(/(["\\])/g, "\\$1") + '"' : "'" + c.raw + "'";
          const prefix = e.value.match(/^[@\-:+!]*/)[0];
          const fixed = key + "=" + prefix + "/bin/sh -c " + inner;
          add("error", "shell-syntax", e.line, "Shell syntax in " + key + "= (" + m[0].trim() + ")",
            "systemd runs the program directly, not through a shell. `" + m[0].trim() + "` is passed to " + (c.base || "the program") + " as a literal argument — the pipe or redirect silently never happens, and systemd-analyze does not warn.",
            fixed, [{ op: "replace", line: e.line, endLine: e.endLine, text: fixed }]);
        } else if (/(^|\s)~\//.test(u)) {
          add("warn", "tilde", e.line, "~ in " + key + "= arguments", "Not expanded — the program receives a literal ~. Use %h or an absolute path.");
        }
      }
      if (!c.exe.startsWith("/") && !c.exe.startsWith("%") && !c.exe.startsWith("$")) {
        add("info", "relative-exe", e.line, "Executable is not an absolute path",
          "systemd looks it up in its own fixed search path, not your shell's $PATH — binaries in a venv, ~/.local/bin or ~/.npm-global are not found. Use the full path (`command -v " + c.exe + "`).");
      }
      // % specifiers inside a date/strftime format: +%Y-%m-%d
      const fmt = c.words.find((w) => /^\+.*%[A-Za-z]/.test(w) && !/%%/.test(w));
      if (fmt) {
        const fixedLine = key + "=" + e.value.replace(fmt, fmt.replace(/%/g, "%%"));
        add("warn", "specifier", e.line, "% in " + key + "= is a systemd specifier",
          "systemd expands %m (machine ID), %d, %H, %Y… before the command runs, so `" + fmt + "` is mangled. Write %% for a literal %.",
          fixedLine, [{ op: "replace", line: e.line, endLine: e.endLine, text: fixedLine }]);
      }
      if (key === "ExecStart" && !last(p, "Service", "WorkingDirectory")) {
        const rel = innerCmd(c).words.slice(1).find((w) => /^(\.{1,2}\/)?[\w.-]+(\/[\w.-]+)*\.(py|js|mjs|sh|rb|pl|jar|php|ts)$/.test(w) && !w.startsWith("/"));
        if (rel) add("warn", "relative-arg", e.line, "Relative script path without WorkingDirectory=",
          "`" + rel + "` is resolved against / (the default working directory), so the file is not found. Set WorkingDirectory= or use an absolute path.",
          "WorkingDirectory=/path/to/app");
      }
    }

    function pythonCheck(execs) {
      for (const e of execs) {
        const c = innerCmd(execCmd(e.value));
        const isPy = /^python[\d.]*$/.test(c.base) || /\.py$/.test(c.base);
        if (!isPy) continue;
        const opts = [];
        for (const w of c.words.slice(1)) { if (!w.startsWith("-")) break; opts.push(w); }
        if (opts.some((w) => /^-[A-Za-z]*u[A-Za-z]*$/.test(w) && !w.startsWith("--"))) return;
        const env = listValues(p, "Service", "Environment").some((x) => words(x.value).some((a) => /^PYTHONUNBUFFERED=(?!0?$)./.test(a)));
        if (env) return;
        const hasFile = listValues(p, "Service", "EnvironmentFile").length > 0;
        add(hasFile ? "info" : "warn", "python-buffered", e.line, "Python output will be block-buffered",
          "Under systemd, stdout is a pipe to the journal, not a terminal, so Python buffers it in 8 KB blocks. A daemon that prints a little can run for days with nothing in `journalctl`, and a restart (SIGTERM) throws the buffer away. StandardOutput=journal does not fix this." +
          (hasFile ? " (Ignore this if your EnvironmentFile= already sets PYTHONUNBUFFERED=1.)" : ""),
          "Environment=PYTHONUNBUFFERED=1", [{ op: "add", section: "Service", key: "Environment", value: "PYTHONUNBUFFERED=1" }]);
        return;
      }
    }

    function crashLoopCheck(restart, restartE) {
      if (!RESTARTS_ON_FAILURE.has(restart)) return;
      const rsE = last(p, "Service", "RestartSec");
      const rs = rsE && !Number.isNaN(timespan(rsE.value)) ? timespan(rsE.value) : 0.1;
      const ivE = last(p, "Unit", "StartLimitIntervalSec") || last(p, "Unit", "StartLimitInterval") || last(p, "Service", "StartLimitInterval");
      const iv = ivE && !Number.isNaN(timespan(ivE.value)) ? timespan(ivE.value) : 10;
      const buE = last(p, "Unit", "StartLimitBurst") || last(p, "Service", "StartLimitBurst");
      const bu = buE && /^\d+$/.test(buE.value) ? +buE.value : 5;
      const ignored = last(p, "Service", "StartLimitIntervalSec");
      if (iv === 0 || bu === 0) {
        add("warn", "crash-loop", (ivE || buE).line, "Start rate limit is disabled",
          "With " + (iv === 0 ? "StartLimitIntervalSec=0" : "StartLimitBurst=0") + " a crashing service restarts forever. That may be intended — but it will never reach the failed state you would alert on.");
        return;
      }
      if (rs * bu >= iv) {
        const need = Math.max(60, Math.ceil(rs * bu * 4 / 60) * 60);
        const patch = [{ op: "set", section: "Unit", key: "StartLimitIntervalSec", value: String(need) }];
        if (!last(p, "Unit", "StartLimitBurst")) patch.push({ op: "set", section: "Unit", key: "StartLimitBurst", value: String(bu) });
        for (const k of ["StartLimitBurst", "StartLimitInterval", "StartLimitIntervalSec"]) {
          for (const x of inSection(p, "Service", k)) patch.push({ op: "remove", line: x.line, endLine: x.endLine });
        }
        add("warn", "crash-loop", (rsE || restartE).line, "The crash loop can never stop",
          "Restart=" + restart + " with RestartSec=" + fmtSec(rs) + ": " + bu + " restarts take at least " + fmtSec(rs * bu) + ", but the limit only trips if they fit inside StartLimitIntervalSec=" + fmtSec(iv) +
          (ignored ? " (your StartLimitIntervalSec= in [Service] is ignored, so this is the default)" : "") +
          ". A broken service restarts forever and shows `activating (auto-restart)`, never `failed` — so `is-active` checks and OnFailure= alerts never fire.",
          "[Unit]\nStartLimitIntervalSec=" + need + "\nStartLimitBurst=" + bu, patch);
      }
    }
  }

  // ---------- patching / scoring ----------

  function applyPatches(text, patches) {
    let out = String(text).replace(/\r\n?/g, "\n").split("\n");
    const repl = new Map();
    for (const q of patches) {
      if (q.op !== "replace" && q.op !== "remove") continue;
      repl.set(q.line, q.op === "remove" ? null : q.text);
      for (let l = q.line + 1; l <= (q.endLine || q.line); l++) repl.set(l, null);
    }
    out = out.flatMap((l, i) => (repl.has(i + 1) ? (repl.get(i + 1) === null ? [] : [repl.get(i + 1)]) : [l]));
    const done = new Set();
    for (const q of patches) {
      if (q.op !== "set" && q.op !== "add") continue;
      const sig = q.op + q.section + q.key + q.value;
      if (done.has(sig)) continue;
      done.add(sig);
      const p = parse(out.join("\n"));
      const line = q.key + "=" + q.value;
      if (q.op === "set") {
        const e = last(p, q.section, q.key);
        if (e) { out.splice(e.line - 1, e.endLine - e.line + 1, line); continue; }
      } else if (inSection(p, q.section, q.key).some((e) => e.value === q.value)) continue;
      const sec = p.sections.filter((s) => s.name === q.section).pop();
      if (sec) {
        const es = p.entries.filter((e) => e.section === q.section && e.line > sec.line);
        out.splice(es.length ? es[es.length - 1].endLine : sec.line, 0, line);
      } else if (q.section === "Unit") {
        out.splice(0, 0, "[Unit]", line, "");
      } else {
        const inst = p.sections.find((s) => s.name === "Install");
        if (inst && q.section !== "Install") out.splice(inst.line - 1, 0, "[" + q.section + "]", line, "");
        else { while (out.length && out[out.length - 1].trim() === "") out.pop(); out.push("", "[" + q.section + "]", line, ""); }
      }
    }
    return out.join("\n");
  }

  const WEIGHT = { error: 15, warn: 6, info: 1 };
  function result(p, F, o, kind) {
    const order = { error: 0, warn: 1, info: 2 };
    F.sort((a, b) => order[a.sev] - order[b.sev] || a.line - b.line);
    const counts = { error: 0, warn: 0, info: 0 };
    for (const f of F) counts[f.sev]++;
    const score = Math.max(0, 100 - F.reduce((s, f) => s + WEIGHT[f.sev], 0));
    const grade = !p.entries.length ? "—" : counts.error ? (score >= 60 ? "D" : "F") : score >= 97 ? "A" : score >= 88 ? "B" : "C";
    const patches = F.filter((f) => f.patch).flatMap((f) => f.patch);
    const text = p.lines.join("\n");
    return { findings: F, counts, score, grade, kind, fixable: F.filter((f) => f.patch).length, patched: patches.length ? applyPatches(text, patches) : text };
  }

  return { analyze, parse, applyPatches, timespan, KEYS };
});
