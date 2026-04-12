        var clientConfig = null;
        var INFERENCE_CONFIG_REL = 'dl-spam-classifier-master/dl-spam-classifier-master/inference_output_config.json';

        /** Dataset labels are spam/ham. UI describes bulk-style vs personal (not safety or scams). */
        var UI_LABEL = {
            bulk: 'Bulk-style',
            personal: 'Personal-style',
            uncertain: 'Borderline',
            unavailable: 'Unavailable'
        };

        function mapApiLabelToDisplay(apiLabel) {
            if (apiLabel == null || apiLabel === '') return UI_LABEL.unavailable;
            var s = String(apiLabel).toLowerCase();
            if (s.indexOf('uncertain') !== -1) return UI_LABEL.uncertain;
            if (s.indexOf('not') !== -1 && s.indexOf('spam') !== -1) return UI_LABEL.personal;
            if (s.indexOf('ham') !== -1) return UI_LABEL.personal;
            if (s.indexOf('spam') !== -1) return UI_LABEL.bulk;
            return String(apiLabel);
        }

        function getApiBase() {
            return typeof getSpamClassifierApiBase === 'function'
                ? getSpamClassifierApiBase()
                : 'https://omsshah-spam-classifier-api.hf.space';
        }

        function initSpamApiGateBanner() {
            var el = document.getElementById('spam-api-gate-banner');
            if (!el || typeof getSpamClassifierApiGateState !== 'function') return;
            var st = getSpamClassifierApiGateState();
            if (st.mode === 'default') {
                el.hidden = true;
                el.textContent = '';
                el.removeAttribute('data-gate');
                return;
            }
            el.hidden = false;
            if (st.mode === 'rejected') {
                el.setAttribute('data-gate', 'rejected');
                el.textContent =
                    'A disallowed custom API was ignored (only HTTPS *.hf.space and HTTP on localhost / 127.0.0.1 are permitted). Using the default hosted API.';
                return;
            }
            el.setAttribute('data-gate', 'custom');
            var origin = st.displayUrl;
            try {
                origin = new URL(st.displayUrl).origin;
            } catch (e) {
                /* keep displayUrl */
            }
            el.textContent =
                'Custom inference host (' +
                st.source +
                '): ' +
                origin +
                '. Messages you analyze are POSTed only to this origin.';
        }

        function loadClientConfig() {
            return fetch(INFERENCE_CONFIG_REL)
                .then(function (r) {
                    if (!r.ok) return Promise.reject();
                    return r.json();
                })
                .catch(function () {
                    return fetch(getApiBase() + '/inference-config').then(function (r) {
                        if (!r.ok) return Promise.reject();
                        return r.json();
                    });
                })
                .then(function (cfg) {
                    clientConfig = cfg;
                })
                .catch(function () {
                    clientConfig = null;
                });
        }

        document.addEventListener('DOMContentLoaded', function () {
            initSpamApiGateBanner();
            loadClientConfig().finally(function () {
            /* Mobile nav: handled by script.js (shared with index.html). */

            var SAMPLE_MESSAGES = [
                // --- HAM ---
                { text: "Hey, are you free this weekend? Thinking of catching a movie", type: "ham", label: "Personal-style (ham)" },
                { text: "Can you pick up some milk on the way home? Also bread if they have it", type: "ham", label: "Personal-style (ham)" },
                { text: "Running about 10 minutes late, sorry! Save me a seat", type: "ham", label: "Personal-style (ham)" },
                { text: "Happy birthday! Hope you have a great day", type: "ham", label: "Personal-style (ham)" },
                { text: "The meeting has been moved to 3pm tomorrow. See you then", type: "ham", label: "Personal-style (ham)" },
                { text: "Did you see the game last night? What an ending", type: "ham", label: "Personal-style (ham)" },
                { text: "Thanks for dinner, it was really lovely. We should do it again soon", type: "ham", label: "Personal-style (ham)" },
                { text: "Reminder: Your appointment is confirmed for Thursday at 2pm. See you then", type: "ham", label: "Personal-style (ham)" },
                { text: "Can we reschedule our call to next week? Something came up on my end", type: "ham", label: "Personal-style (ham)" },
                { text: "Just checking in, hope you are feeling better", type: "ham", label: "Personal-style (ham)" },
                { text: "Your order has shipped and is estimated to arrive by Friday", type: "ham", label: "Personal-style (ham)" },
                { text: "I left my keys at yours, is it ok if I swing by later to grab them?", type: "ham", label: "Personal-style (ham)" },
                { text: "Lunch tomorrow still on? I was thinking the usual place around noon", type: "ham", label: "Personal-style (ham)" },
                { text: "Your prescription will be ready tomorrow afternoon, just pop in anytime", type: "ham", label: "Personal-style (ham)" },
                { text: "Let me know when you are free to catch up, it has been ages", type: "ham", label: "Personal-style (ham)" },
                // --- SPAM ---
                { text: "WINNER! You have been selected for a $500 gift card. Click here to claim: bit.ly/claim-gift77", type: "spam", label: "Bulk-style (spam)" },
                { text: "URGENT: Your account has been suspended. Verify your identity now at secure-verify.net", type: "spam", label: "Bulk-style (spam)" },
                { text: "Congratulations! You have won a free iPhone. Claim before it expires: tinyurl.com/win-phone", type: "spam", label: "Bulk-style (spam)" },
                { text: "Your debit card has been blocked. Reactivate now at http://mybank-verify.info", type: "spam", label: "Bulk-style (spam)" },
                { text: "Earn $300 per day working from home. No experience needed. Reply YES to get started", type: "spam", label: "Bulk-style (spam)" },
                { text: "FREE ENTRY: Win a luxury holiday for two. Visit tinyurl.com/holiday-win to enter now", type: "spam", label: "Bulk-style (spam)" },
                { text: "ALERT: Unusual login detected on your account. Confirm your PIN to secure it: bit.ly/secure-now", type: "spam", label: "Bulk-style (spam)" },
                { text: "Your parcel could not be delivered. Pay the $1.99 redelivery fee here: bit.ly/pkg-redeliver", type: "spam", label: "Bulk-style (spam)" },
                { text: "Your loan of $10,000 has been approved. Accept now: bit.ly/loan-ok. Offer expires today", type: "spam", label: "Bulk-style (spam)" },
                { text: "Claim a FREE $200 voucher. Limited time only. No purchase required: tinyurl.com/voucher200", type: "spam", label: "Bulk-style (spam)" },
                { text: "You have been selected as a lottery winner. Contact our agent to claim your prize today", type: "spam", label: "Bulk-style (spam)" },
                { text: "LAST CHANCE: Confirm your details to avoid account closure. Do not ignore this message", type: "spam", label: "Bulk-style (spam)" },
                { text: "Urgent: Venmo says your profile is LOCKED. Re-verify your account and PIN at http://tinyurl.com/fake-venmo-now", type: "spam", label: "Bulk-style (spam)" },
                { text: "You have WON a FREE Galaxy tablet! Claim your redemption form before midnight: bit.ly/tablet-claim-now. $900 USD prize inside!", type: "spam", label: "Bulk-style (spam)" },
                { text: "Your account has been flagged. Verify immediately to avoid suspension: https://tinyurl.com/fake-bank-eu", type: "spam", label: "Bulk-style (spam)" },
                { text: "Your FedEx parcel could not be delivered - pay $3.50 customs fee: www.fake-parcel-secure.net/pay", type: "spam", label: "Bulk-style (spam)" },
                { text: "CONGRATS!! You are selected as our hourly WINNER - $3200 USD waiting: https://bit.ly/prize-claim-fake-77", type: "spam", label: "Bulk-style (spam)" }
            ];

            var _lastSampleIdx = -1;
            function pickSample() {
                var idx;
                do { idx = Math.floor(Math.random() * SAMPLE_MESSAGES.length); }
                while (idx === _lastSampleIdx && SAMPLE_MESSAGES.length > 1);
                _lastSampleIdx = idx;
                return SAMPLE_MESSAGES[idx];
            }

            const input = document.getElementById('spam-input');
            const analyzeBtn = document.getElementById('analyze-btn');
            const clearBtn = document.getElementById('clear-btn');
            const randomBtn = document.getElementById('random-btn');
            const randomLabel = document.getElementById('random-label');
            const resultBox = document.getElementById('demo-result');
            const resultEmpty = document.getElementById('demo-result-empty');
            const verdictBadge = document.getElementById('verdict-badge');
            const predictionText = document.getElementById('prediction-text');
            const confidenceText = document.getElementById('confidence-text');
            const confidenceFill = document.getElementById('confidence-fill');
            const signalsList = document.getElementById('signals-list');
            const highlightWrap = document.getElementById('spam-highlight-wrap');
            const highlightEl = document.getElementById('spam-highlight');
            const highlightWhyEl = document.getElementById('spam-highlight-why');
            const inboxToggle = document.getElementById('demo-inbox-toggle');
            const inboxPanel = document.getElementById('demo-inbox-panel');
            const batchInput = document.getElementById('spam-batch-input');
            const batchRun = document.getElementById('demo-batch-run');
            const batchStatus = document.getElementById('demo-batch-status');
            const batchResults = document.getElementById('demo-batch-results');
            const inferenceWrap = document.getElementById('demo-inference-trace');
            const inferencePre = document.getElementById('demo-inference-pre');
            const inferenceFlags = document.getElementById('demo-inference-flags');
            const demoConfidenceHint = document.getElementById('demo-confidence-hint');
            const demoLatencyLine = document.getElementById('demo-latency-line');
            var inferenceTick = null;

            function displayProbabilityPercent(p) {
                var raw = p * 100;
                var cap = 99.9;
                try {
                    var ic = clientConfig && clientConfig.interpretation;
                    if (ic && ic.display_pct_cap != null) {
                        cap = Number(ic.display_pct_cap);
                    }
                } catch (e) {}
                var displayNum = raw >= cap ? cap : raw;
                var text = '~' + displayNum.toFixed(1) + '%';
                var saturated = raw >= cap - 0.05;
                var barW = Math.min(cap, raw);
                return { text: text, barWidth: barW, saturated: saturated };
            }

            function credSaturatedUiNote() {
                var cr = clientConfig && clientConfig.client && clientConfig.client.credibility;
                return (cr && cr.saturated_ui_note) || '';
            }

            function getLoadingSuffix() {
                var s = clientConfig && clientConfig.client && clientConfig.client.loading_suffix;
                return s || 'tokenize, pad, one CNN forward pass';
            }

            function getApiVersionError() {
                var s = clientConfig && clientConfig.client && clientConfig.client.api_version_error;
                return (
                    s ||
                    'API response does not match this demo (server may need updating).'
                );
            }

            function synthesizeInterpretation(p, thr) {
                var ic = clientConfig && clientConfig.interpretation;
                var hamBelow =
                    ic && ic.clear_ham_below != null ? Number(ic.clear_ham_below) : 0.35;
                var spamAbove =
                    ic && ic.clear_spam_above != null ? Number(ic.clear_spam_above) : 0.65;
                if (p <= hamBelow) {
                    return { band: 'clear_ham', lean: null };
                }
                if (p >= spamAbove) {
                    return { band: 'clear_spam', lean: null };
                }
                return { band: 'uncertain', lean: p < thr ? 'ham' : 'spam' };
            }

            function applyRuleBoost(result, clientSigs) {
                if (!clientSigs || !clientSigs.length) return;
                var raw = result.probability;
                var boost = 0;
                clientSigs.forEach(function (sig) {
                    boost += RULE_WEIGHTS[sig.family] || 0.10;
                });
                boost = Math.min(boost, 0.65);
                var adjusted = raw + boost * (1 - raw);
                if (adjusted - raw < 0.03) return;
                var thr = 0.5;
                result.probability = adjusted;
                result.binarySpam = adjusted >= thr;
                result.interpretation = synthesizeInterpretation(adjusted, thr);
                result.label = adjusted >= thr ? 'Spam' : 'Not spam';
                result.displayLabel = mapApiLabelToDisplay(result.label);
            }

            function parsePredictResponse(data) {
                if (
                    data.summary == null ||
                    data.label == null ||
                    data.confidence_hint == null ||
                    data.technical_note == null ||
                    data.spam_probability == null
                ) {
                    throw new Error(getApiVersionError());
                }
                var p = data.spam_probability;
                var thr =
                    data.threshold != null
                        ? Number(data.threshold)
                        : clientConfig &&
                          clientConfig.decision &&
                          clientConfig.decision.default_threshold != null
                          ? Number(clientConfig.decision.default_threshold)
                          : 0.5;
                var binarySpam =
                    data.binary_spam != null ? data.binary_spam : p >= thr;
                var interpretation =
                    data.interpretation != null
                        ? data.interpretation
                        : synthesizeInterpretation(p, thr);
                var spans = data.highlight_spans || [];
                var sigs = [
                    {
                        reason: 'Model notes',
                        detail: data.technical_note
                    }
                ];
                if (data.attribution_signal && spans.length) {
                    sigs.push({
                        reason: data.attribution_signal.title,
                        detail: data.attribution_signal.detail
                    });
                }
                return {
                    label: data.label,
                    displayLabel: mapApiLabelToDisplay(data.label),
                    binarySpam: binarySpam,
                    interpretation: interpretation,
                    probability: p,
                    trace: data.trace || null,
                    apiError: false,
                    thresholdHint: data.confidence_hint,
                    signals: sigs,
                    highlightSpans: spans
                };
            }

            function traceLabel(key, fallback) {
                var tl = clientConfig && clientConfig.client && clientConfig.client.trace_labels;
                return (tl && tl[key]) || fallback;
            }

            function handleSignalClick(e) {
                var btn = e.target.closest('.signal-toggle');
                if (!btn) return;
                e.preventDefault();
                var row = btn.closest('.signal-row');
                var panel = row && row.querySelector('.signal-detail');
                if (!panel) return;
                var expanded = btn.getAttribute('aria-expanded') === 'true';
                var next = !expanded;
                btn.setAttribute('aria-expanded', String(next));
                panel.hidden = !next;
                row.classList.toggle('is-open', next);
            }

            signalsList.addEventListener('click', handleSignalClick);

            var whySigListEl = document.getElementById('demo-why-signals');
            if (whySigListEl) whySigListEl.addEventListener('click', handleSignalClick);

            function buildSignalRow(label, detailText, options) {
                options = options || {};
                var li = document.createElement('li');
                li.className = 'signal-row';
                if (options.openDetail) li.classList.add('is-open');
                var card = document.createElement('div');
                card.className = 'signal-card';
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'signal-toggle';
                var expanded = !!options.openDetail;
                btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                var chev = document.createElement('span');
                chev.className = 'signal-chevron';
                chev.setAttribute('aria-hidden', 'true');
                chev.textContent = '▸';
                var sumText = document.createElement('span');
                sumText.className = 'signal-summary-text';
                sumText.textContent = label;
                var explain = document.createElement('span');
                    explain.className = 'signal-explain';
                    explain.textContent = 'Explanation';
                btn.appendChild(chev);
                btn.appendChild(sumText);
                btn.appendChild(explain);
                var panel = document.createElement('div');
                panel.className = 'signal-detail';
                panel.hidden = !expanded;
                var inner = document.createElement('div');
                inner.className = 'signal-detail-inner';
                var p = document.createElement('p');
                if (options.preWrap) {
                    p.className = 'signal-detail-pre';
                }
                p.textContent = detailText || 'No additional details.';
                inner.appendChild(p);
                panel.appendChild(inner);
                card.appendChild(btn);
                card.appendChild(panel);
                li.appendChild(card);
                return li;
            }

            function escapeHtml(s) {
                return String(s)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            }

            var SIGNAL_RULES = [
                {
                    family: 'Threat, scam, or malware wording',
                    alias: null,
                    detail: 'Words like "phishing", "scam", or "fraud" almost never appear in normal everyday messages. Legitimate services do not describe themselves using threat language. When these words appear unsolicited, it is usually because the sender is trying to create alarm or imitate a security warning to prompt a reaction.',
                    patterns: [/\b(phish(?:ing)?|scam|fraud(?:ulent)?|malware|ransom(?:ware)?|trojan|spyware|deceptive|impersonat(?:e|ing|ion))\b/i]
                },
                {
                    family: 'Verify \/ confirm \/ account scare wording',
                    alias: null,
                    detail: 'Phrases like "unusual login" or "account suspended" are a hallmark of credential phishing. Legitimate companies rarely send vague scare messages via SMS. Real security alerts from your bank or a service usually include your name, partial account details, and a verified sender ID, not generic alarm language asking you to act immediately.',
                    patterns: [
                        /unusual\s+(?:login|sign[- ]in|activity|access)/i,
                        /suspicious\s+(?:login|activity|access)/i,
                        /account\s+(?:suspended|locked|compromised|flagged|at\s+risk)/i,
                        /verify\s+your\s+(?:identity|account|email|number)/i
                    ]
                },
                {
                    family: 'Verify account or password combo',
                    alias: 'Account or password keywords',
                    detail: 'Legitimate services never ask you to confirm a PIN, password, or account details over SMS. "Re-activate your account" and similar phrases are almost exclusively used in social engineering attempts. Real platforms use automated secure flows, not a text message asking you to type in sensitive information.',
                    patterns: [
                        /re[- ]?activ(?:ate|ation)/i,
                        /confirm\s+your\s+(?:pin|password|account|details)/i,
                        /reset\s+(?:your\s+)?password/i,
                        /update\s+your\s+(?:payment|billing|card|account)\s+(?:details|info)/i
                    ]
                },
                {
                    family: 'Contains a URL',
                    alias: 'URL shortener domain',
                    detail: 'Shortened or generic URLs hide where the link actually goes. Legitimate businesses use their own branded domains (e.g. amazon.com, ups.com), not link shorteners like bit.ly or tinyurl.com. Unsolicited links in SMS are one of the most common delivery methods for phishing pages and malware.',
                    patterns: [
                        /https?:\/\/[^\s]+/i,
                        /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|buff\.ly|rb\.gy)\b/i
                    ]
                },
                {
                    family: 'Urgency or deadline pressure',
                    alias: null,
                    detail: 'Creating a sense of urgency is a well-documented manipulation tactic in spam and scam messages. Phrases like "act now" or "expires today" are designed to make you respond before thinking critically. Genuine communication from real organisations rarely includes artificial countdowns or all-caps demands to respond immediately.',
                    patterns: [/\b(?:urgent|act\s+now|respond\s+immediately|within\s+\d{1,2}\s+hours?|expires?\s+(?:today|soon)|last\s+(?:chance|warning)|don.t\s+(?:ignore|delay))\b/i]
                },
                {
                    family: 'Prize, win, or lottery',
                    alias: null,
                    detail: 'Unsolicited prize or lottery notifications sent via SMS are almost always spam. Real competitions notify winners through official channels using your registered name and account, not a mass text blast. "You have won" language sent cold to a phone number is a classic pattern used in bulk spam campaigns.',
                    patterns: [/\b(?:(?:you(?:'ve|\s+have)\s+)?(?:won|win(?:ner)?)|claim\s+(?:your\s+)?(?:prize|reward|gift)|lottery|jackpot|selected\s+(?:as\s+)?(?:a\s+)?winner)\b/i]
                },
                {
                    family: 'Free offer or cash lure',
                    alias: null,
                    detail: 'Offers of free money, gifts, or cash rewards via unsolicited SMS are almost universally spam. Legitimate employers and brands do not cold-text people with dollar amounts or "free gift" offers. This language pattern is strongly associated with work-from-home scams and marketing spam.',
                    patterns: [
                        /\bfree\s+(?:money|cash|gift|prize|iphone|ipad|voucher|coupon)\b/i,
                        /\bcash\s+(?:prize|reward|bonus)\b/i,
                        /\b(?:earn|make)\s+\$\d+/i
                    ]
                },
                {
                    family: 'OTP or banking language',
                    alias: null,
                    detail: 'Your bank already knows your name and account details and would include them in any real alert. An unsolicited message using generic banking language like "debit alert" or "your OTP" without any personal identifiers suggests someone is impersonating a financial institution. Scammers use this language to trick people into handing over authentication codes.',
                    patterns: [
                        /\b(?:OTP|one[- ]time\s+(?:password|passcode|pin)|authorization\s+code)\b/i,
                        /\b(?:debit|credit)\s+(?:alert|notification)\b/i,
                        /your\s+(?:bank\s+)?(?:account|card)\s+(?:has\s+been|was)\s+(?:charged|debited|suspended|blocked)\b/i
                    ]
                }
            ];

            var RULE_WEIGHTS = {
                'Threat, scam, or malware wording':           0.22,
                'Verify \/ confirm \/ account scare wording': 0.20,
                'Verify account or password combo':           0.20,
                'OTP or banking language':                    0.20,
                'Urgency or deadline pressure':               0.18,
                'Contains a URL':                             0.15,
                'Prize, win, or lottery':                     0.14,
                'Free offer or cash lure':                    0.12
            };

            function runClientSignals(text) {
                var hits = [];
                var seen = {};
                SIGNAL_RULES.forEach(function (rule) {
                    if (seen[rule.family]) return;
                    rule.patterns.forEach(function (pat) {
                        if (seen[rule.family]) return;
                        var m = text.match(pat);
                        if (!m) return;
                        seen[rule.family] = true;
                        var matched = m[0].length > 50 ? m[0].slice(0, 50) + '\u2026' : m[0];
                        var label = rule.alias
                            ? rule.family + ' (also: ' + rule.alias + ')'
                            : rule.family;
                        label += ': \u201c' + matched + '\u201d';
                        hits.push({
                                reason: label,
                                family: rule.family,
                                detail: rule.detail || 'Matched a known spam signal pattern. The confidence score above comes from the neural network and may differ from what rules alone would indicate.'
                            });
                    });
                });
                if (hits.length >= 3) {
                    hits.push({
                        reason: 'Several different rule families fired',
                        detail: hits.length + ' signal families matched. Co-occurring signals across multiple categories are associated with higher spam probability in rule-based classifiers.'
                    });
                }
                return hits;
            }

            function buildOfflineFallbackResult(message, err) {
                var boost = 0;
                var sigs = runClientSignals(message || '');
                sigs.forEach(function (sig) {
                    if (sig.family) boost += RULE_WEIGHTS[sig.family] || 0.10;
                });
                var p = Math.min(0.94, 0.1 + boost * 0.75);
                if (message && message.trim().length < 15) p += 0.03;
                var thr = 0.5;
                var interpretation = synthesizeInterpretation(p, thr);
                var label = p >= thr ? 'Spam' : 'Not spam';
                return {
                    label: label,
                    displayLabel: mapApiLabelToDisplay(label),
                    binarySpam: p >= thr,
                    interpretation: interpretation,
                    probability: p,
                    trace: null,
                    apiError: false,
                    offlineFallback: true,
                    thresholdHint: 'Offline estimate only',
                    signals: [
                        {
                            reason: 'API unavailable',
                            detail: getSetupHelpText(err && err.message ? err.message : err),
                            _rowOpts: { openDetail: true, preWrap: true }
                        },
                        {
                            reason: 'Model notes',
                            detail:
                                'Keyword-only stand-in. Real scores come from the neural network when the backend API responds.'
                        }
                    ],
                    highlightSpans: []
                };
            }

            var WHY_LABELS = {
                'Threat, scam, or malware wording':          'suspicious or phishing-style language',
                'Verify / confirm / account scare wording':  'urgent account verification language',
                'Verify account or password combo':          'password or login-related requests',
                'Contains a URL':                            'contains an external link',
                'Urgency or deadline pressure':              'pressure tactics or deadline language',
                'Prize, win, or lottery':                    'prize or reward language',
                'Free offer or cash lure':                   'financial incentive or free offer language',
                'OTP or banking language':                   'banking or one-time code language'
            };

            /**
             * Extra context when the label is personal-style but the line still looks plausibly sketchy
             * (e.g. fake delivery SMS). The model reflects bulk-style patterns in training data, not fraud.
             */
            function explainPersonalStyleNuance(sourceText, band, lean) {
                var out = [];
                if (!sourceText) return out;
                var t = sourceText.trim();
                if (!t) return out;

                var lowPersonal =
                    band === 'clear_ham' || (band === 'uncertain' && lean === 'ham');
                if (!lowPersonal) return out;

                var hasUrl = /https?:\/\/|\bbit\.ly\/|\btinyurl\.|\bgoo\.gl\//i.test(t);
                var deliveryish =
                    /\b(package|parcel|deliver(y|ed|ies)?|shipping|courier|carrier)\b/i.test(t) ||
                    /could not be delivered|not be delivered|unable to deliver|delivery failed|awaiting (?:redelivery|pickup)|customs fee/i.test(t);

                if (deliveryish) {
                    out.push(
                        'Delivery-themed text can look “phishy” but this model scores bulk-style wording from training data, not safety.'
                    );
                    if (!hasUrl) {
                        out.push('No URL in the text often keeps the score lower than full phishing templates.');
                    }
                }

                return out.slice(0, 2);
            }

            function buildWhyReasons(result, clientSigs, sourceText) {
                if (result.apiError) return [];
                var band = result.interpretation && result.interpretation.band;
                var lean = result.interpretation && result.interpretation.lean;
                var wordCount = sourceText ? sourceText.trim().split(/\s+/).filter(Boolean).length : 0;

                // Extract the words the model actually weighted (occlusion highlights)
                var highlightedText = '';
                if (sourceText && result.highlightSpans && result.highlightSpans.length) {
                    highlightedText = result.highlightSpans
                        .map(function (sp) { return sourceText.slice(sp.start, sp.end); })
                        .join(' ');
                }

                // Labels from highlighted words only (model-confirmed influence)
                var hlLabels = [];
                var seenHL = {};
                if (highlightedText) {
                    runClientSignals(highlightedText).forEach(function (sig) {
                        if (!sig.family) return;
                        var lbl = WHY_LABELS[sig.family];
                        if (lbl && !seenHL[lbl]) { seenHL[lbl] = true; hlLabels.push(lbl); }
                    });
                }

                // Labels from the full text (present but not necessarily model-weighted)
                var fullLabels = [];
                var seenFull = {};
                (clientSigs || []).forEach(function (sig) {
                    if (!sig.family) return;
                    var lbl = WHY_LABELS[sig.family];
                    if (lbl && !seenFull[lbl]) { seenFull[lbl] = true; fullLabels.push(lbl); }
                });

                var reasons = [];
                var nuance = explainPersonalStyleNuance(sourceText, band, lean);
                nuance.forEach(function (line) {
                    reasons.push(line);
                });

                if (band === 'clear_spam') {
                    // Lead with model-confirmed signals, then fill from full text if needed
                    var combined = hlLabels.slice();
                    fullLabels.forEach(function (l) {
                        if (combined.length < 4 && combined.indexOf(l) === -1) combined.push(l);
                    });
                    reasons = combined.slice(0, 4);
                    if (reasons.length === 0) reasons.push('overall word patterns are consistent with spam');
                    if (wordCount > 0 && wordCount <= 5) reasons.push('very short message, common in automated or bulk spam');

                } else if (band === 'clear_ham') {
                    if (fullLabels.length === 0) {
                        if (nuance.length === 0) {
                            reasons.push('no strong spam or phishing indicators found');
                            reasons.push('wording appears consistent with a normal message');
                        } else {
                            reasons.push(
                                'The model still treated the overall n-gram pattern as closer to personal-style than bulk spam on this example.'
                            );
                        }
                        if (wordCount >= 8) reasons.push('message has enough context to read as genuine');
                    } else if (hlLabels.length === 0) {
                        // Patterns exist in the text but the model did not focus on those words
                        reasons.push('some patterns present in the text, but the model did not find them influential');
                        fullLabels.slice(0, 2).forEach(function (l) {
                            reasons.push(l + ' detected, but not weighted by the model');
                        });
                    } else {
                        // Model highlighted those words yet still scored it low
                        reasons.push('flagged patterns present but overall score remains low risk');
                        hlLabels.slice(0, 2).forEach(function (l) {
                            reasons.push(l + ' present, not enough to classify as spam');
                        });
                    }

                } else { // uncertain
                    reasons.push(lean === 'spam'
                        ? 'borderline result, leaning toward spam'
                        : lean === 'ham'
                            ? 'borderline result, leaning toward not spam'
                            : 'mixed signals, result is inconclusive');

                    if (hlLabels.length > 0) {
                        // Model-confirmed signals exist but weren't conclusive
                        hlLabels.slice(0, 2).forEach(function (l) { reasons.push(l + ', but not conclusive on its own'); });
                        // Note any full-text signals the model did NOT weight
                        var unweighted = fullLabels.filter(function (l) { return hlLabels.indexOf(l) === -1; });
                        if (unweighted.length > 0 && reasons.length < 4) {
                            reasons.push(unweighted[0] + ' present in the text but not strongly weighted');
                        }
                    } else if (fullLabels.length > 0) {
                        // Signals exist in the text but model didn't focus on them
                        fullLabels.slice(0, 2).forEach(function (l) {
                            reasons.push(l + ' detected, but the model did not weight it heavily');
                        });
                    } else {
                        reasons.push('limited strong indicators in either direction');
                    }
                }

                return reasons.slice(0, 5);
            }

            function initCredibilityBlock() {
                var credPanel = document.getElementById('demo-credibility-panel');
                var lab = document.getElementById('demo-credibility-toggle-label');
                var cr = clientConfig && clientConfig.client && clientConfig.client.credibility;
                if (!credPanel) return;
                if (!cr || !cr.failure_detail) return;
                if (lab && cr.toggle_label) lab.textContent = cr.toggle_label;
                credPanel.innerHTML =
                    (cr.failure_title
                        ? '<p class="demo-credibility-title">' + escapeHtml(cr.failure_title) + '</p>'
                        : '') +
                    '<p class="demo-credibility-text">' + escapeHtml(cr.failure_detail) + '</p>';
            }

            function stopInferenceTick() {
                if (inferenceTick) {
                    clearInterval(inferenceTick);
                    inferenceTick = null;
                }
            }

            function clearInferenceUI() {
                stopInferenceTick();
                if (inferenceWrap) inferenceWrap.hidden = true;
                if (inferencePre) inferencePre.textContent = '';
                if (inferenceFlags) inferenceFlags.innerHTML = '';
                if (demoConfidenceHint) {
                    demoConfidenceHint.hidden = true;
                    demoConfidenceHint.textContent = '';
                }
                if (demoLatencyLine) {
                    demoLatencyLine.hidden = true;
                    demoLatencyLine.textContent = '';
                }
                if (highlightWhyEl) {
                    highlightWhyEl.hidden = true;
                    highlightWhyEl.textContent = '';
                }
            }

            function showAnalysisLoading() {
                stopInferenceTick();
                resultEmpty.hidden = true;
                resultBox.hidden = false;
                predictionText.textContent = 'Running…';
                verdictBadge.setAttribute('data-verdict', 'neutral');
                confidenceText.textContent = '…';
                confidenceFill.style.width = '0%';
                confidenceFill.classList.remove('is-spam', 'is-ham', 'is-uncertain');
                signalsList.innerHTML = '';
                if (demoConfidenceHint) demoConfidenceHint.hidden = true;
                var _whyEl = document.getElementById('demo-why-section');
                if (_whyEl) _whyEl.hidden = true;
                var _whySigEl = document.getElementById('demo-why-signals');
                if (_whySigEl) { _whySigEl.hidden = true; _whySigEl.innerHTML = ''; }
                if (highlightWrap) highlightWrap.hidden = true;
                if (highlightEl) {
                    highlightEl.innerHTML = '';
                    highlightEl.setAttribute('aria-hidden', 'true');
                }
                if (highlightWhyEl) {
                    highlightWhyEl.hidden = true;
                    highlightWhyEl.textContent = '';
                }
                if (inferenceWrap) {
                    inferenceWrap.hidden = false;
                    inferenceFlags.innerHTML = '';
                }
                var pulse = 0;
                inferenceTick = setInterval(function () {
                    pulse += 1;
                    if (!inferencePre) return;
                    var dots = '·'.repeat((pulse % 3) + 1);
                    inferencePre.textContent =
                        'POST ' +
                        getApiBase() +
                        '/predict …\n' +
                        '  ' +
                        dots +
                        ' ' +
                        getLoadingSuffix();
                }, 380);
            }

            function renderInferenceTrace(trace, p) {
                stopInferenceTick();
                if (!inferenceWrap || !inferencePre || !trace) return;
                inferenceWrap.hidden = false;
                var lines;
                if (trace.display_lines && trace.display_lines.length) {
                    lines = trace.display_lines;
                } else {
                    var shapeStr = trace.padded_shape
                        ? JSON.stringify(trace.padded_shape)
                        : '(1, ' + (trace.max_len != null ? trace.max_len : '?') + ')';
                    var line4 =
                        '[4/4] dense sigmoid → P(bulk-style) = ' +
                        Number(p).toFixed(6) +
                        (trace.decision_threshold != null
                            ? '  (Bulk-style if P >= ' + Number(trace.decision_threshold).toFixed(4) + ')'
                            : '');
                    lines = [
                        '[1/4] texts_to_sequences → ' + trace.token_count + ' token id(s) before padding',
                        '[2/4] pad_sequences → ' + shapeStr + (trace.truncated ? ' (sequence truncated to maxlen)' : ''),
                        '[3/4] ' + (trace.architecture || 'CNN forward pass'),
                        line4,
                    ];
                }
                inferencePre.textContent = lines.join('\n');
                inferenceFlags.innerHTML = '';

                function addLiStrongCode(label, codeText) {
                    var li = document.createElement('li');
                    var s = document.createElement('strong');
                    s.textContent = label + ' ';
                    li.appendChild(s);
                    var c = document.createElement('code');
                    c.textContent = codeText;
                    li.appendChild(c);
                    inferenceFlags.appendChild(li);
                }

                if (trace.model_file) {
                    addLiStrongCode(traceLabel('weights_file', 'Weights file:'), trace.model_file);
                }
                if (trace.backend) {
                    var li2 = document.createElement('li');
                    li2.appendChild(document.createTextNode(trace.backend));
                    inferenceFlags.appendChild(li2);
                }
                if (trace.token_ids_head && trace.token_ids_head.length) {
                    var li3 = document.createElement('li');
                    var st = document.createElement('strong');
                    st.textContent = traceLabel('token_ids_head', 'Token id head (vocab indices): ');
                    li3.appendChild(st);
                    var ids = trace.token_ids_head.join(', ');
                    var extra =
                        trace.token_count > trace.token_ids_head.length
                            ? ' … (+' + (trace.token_count - trace.token_ids_head.length) + ' ids)'
                            : '';
                    li3.appendChild(document.createTextNode(ids + extra));
                    inferenceFlags.appendChild(li3);
                }
                if (trace.inference_ms != null) {
                    var liMs = document.createElement('li');
                    liMs.appendChild(
                        document.createTextNode(
                            'Forward pass latency: ~' + trace.inference_ms + ' ms (host-dependent)'
                        )
                    );
                    inferenceFlags.appendChild(liMs);
                }
            }

            function getSetupHelpText(errMsg) {
                var sh = clientConfig && clientConfig.client && clientConfig.client.setup_help;
                if (sh && sh.quick_fix_lines && sh.quick_fix_lines.length) {
                    var lines = [];
                    if (window.location.protocol === 'file:' && sh.file_protocol_note) {
                        lines.push(sh.file_protocol_note, '');
                    }
                    if (sh.quick_fix_header) lines.push(sh.quick_fix_header);
                    sh.quick_fix_lines.forEach(function (line) {
                        lines.push('• ' + line);
                    });
                    var errSuffix = (sh.error_suffix || 'What went wrong: {error}').replace(
                        '{error}',
                        String(errMsg || 'unknown')
                    );
                    lines.push('', errSuffix);
                    return lines.join('\n');
                }
                var isFile = window.location.protocol === 'file:';
                var lines = [];
                lines.push(
                    'The live demo needs the inference backend API reachable (default: Hugging Face Space hosting the FastAPI app), not local to your browser.'
                );
                if (isFile) {
                    lines.push(
                        'This page is on file:// so browsers often block localhost. Use an http:// URL or see the repository for serving static files.'
                    );
                }
                lines.push(
                    'Implementation and runbook: dl-spam-classifier-master/dl-spam-classifier-master/ (INFERENCE.md).',
                    '',
                    'Error: ' + String(errMsg || 'unknown')
                );
                return lines.join('\n');
            }

            var API_STATUS_DETAIL_LIVE =
                'TensorFlow/Keras CNN on Hugging Face; this page POSTs to /predict with the real tokenizer and weights.';

            function setApiBannerDetail(detailEl, text) {
                if (!detailEl) return;
                var wrap = detailEl.closest('.demo-api-inline-details');
                if (text) {
                    detailEl.textContent = text;
                    detailEl.hidden = false;
                    if (wrap) wrap.hidden = false;
                } else {
                    detailEl.textContent = '';
                    if (wrap) wrap.hidden = true;
                }
            }

            function refreshApiStatus() {
                var banner = document.getElementById('spam-api-banner');
                var textEl = document.getElementById('spam-api-status-text');
                var detailEl = document.getElementById('spam-api-status-detail');
                if (!banner || !textEl) return;
                var base = getApiBase();
                fetch(base + '/health', { method: 'GET' })
                    .then(function (r) {
                        if (!r.ok) throw new Error(String(r.status));
                        return r.json();
                    })
                    .then(function (j) {
                        var staticOff = document.getElementById('demo-static-offline');
                        if (j && j.ok && j.model_loaded) {
                            banner.className = 'demo-api-banner demo-api-banner--ok';
                            textEl.textContent = 'Live API.';
                            setApiBannerDetail(detailEl, API_STATUS_DETAIL_LIVE);
                            if (staticOff) staticOff.hidden = true;
                        } else {
                            banner.className = 'demo-api-banner demo-api-banner--warn';
                            textEl.textContent =
                                'Host responded but the model is not loaded yet.';
                            setApiBannerDetail(
                                detailEl,
                                'The FastAPI process is up on Hugging Face Spaces but dl_model.keras may still be loading. Wait a few seconds and refresh, or check the Space logs.'
                            );
                            if (staticOff) staticOff.hidden = true;
                        }
                    })
                    .catch(function () {
                        banner.className = 'demo-api-banner demo-api-banner--warn';
                        var extra =
                            window.location.protocol === 'file:'
                                ? ' Try opening the page over http:// instead of file://.'
                                : '';
                        textEl.textContent =
                            'API offline; keyword fallback below.' + extra;
                        setApiBannerDetail(
                            detailEl,
                            'When the API returns, inference uses the same server pipeline. Offline mode is keyword-only.'
                        );
                        var staticOff = document.getElementById('demo-static-offline');
                        if (staticOff) staticOff.hidden = false;
                    });
            }

            function buildHighlightHtml(text, spans) {
                if (!spans || !spans.length) return escapeHtml(text);
                spans = spans.slice().sort(function (a, b) {
                    return a.start - b.start;
                });
                var html = '';
                var pos = 0;
                spans.forEach(function (sp) {
                    html += escapeHtml(text.slice(pos, sp.start));
                    var titleAttr = '';
                    if (sp.delta != null && !isNaN(Number(sp.delta))) {
                        var deltaPct = escapeHtml(
                            (Math.abs(Number(sp.delta)) * 100).toFixed(2)
                        );
                        titleAttr =
                            ' title="Hiding this word moved P(bulk-style) by ~' +
                            deltaPct +
                            '%"';
                    }
                    html +=
                        '<mark class="signal-hit"' +
                        titleAttr +
                        '>' +
                        escapeHtml(text.slice(sp.start, sp.end)) +
                        '</mark>';
                    pos = sp.end;
                });
                html += escapeHtml(text.slice(pos));
                return html;
            }

            function showResults(show) {
                resultEmpty.hidden = show;
                resultBox.hidden = !show;
            }

            function renderResult(result, sourceText) {
                if (result.apiError) {
                    stopInferenceTick();
                    if (inferenceWrap) {
                        inferenceWrap.hidden = false;
                        if (inferencePre) inferencePre.textContent = result.inferenceErrorText || '';
                        if (inferenceFlags) inferenceFlags.innerHTML = '';
                    }
                } else if (result.trace) {
                    renderInferenceTrace(result.trace, result.probability);
                } else if (inferenceWrap) {
                    inferenceWrap.hidden = true;
                }

                predictionText.textContent =
                    result.displayLabel != null
                        ? result.displayLabel
                        : mapApiLabelToDisplay(result.label);
                if (result.apiError) {
                    verdictBadge.setAttribute('data-verdict', 'neutral');
                    confidenceText.textContent = '-';
                    confidenceFill.style.width = '0%';
                    confidenceFill.classList.remove('is-spam', 'is-ham', 'is-uncertain');
                    if (demoConfidenceHint) demoConfidenceHint.hidden = true;
                    if (demoLatencyLine) {
                        demoLatencyLine.hidden = true;
                        demoLatencyLine.textContent = '';
                    }
                } else {
                    var band = result.interpretation && result.interpretation.band;
                    if (band === 'clear_spam') {
                        verdictBadge.setAttribute('data-verdict', 'spam');
                    } else if (band === 'clear_ham') {
                        verdictBadge.setAttribute('data-verdict', 'ham');
                    } else {
                        verdictBadge.setAttribute('data-verdict', 'uncertain');
                    }
                    var dp = displayProbabilityPercent(result.probability);
                    confidenceText.textContent = dp.text;
                    confidenceFill.style.width = dp.barWidth + '%';
                    confidenceFill.classList.remove('is-spam', 'is-ham', 'is-uncertain');
                    if (band === 'clear_spam') {
                        confidenceFill.classList.add('is-spam');
                    } else if (band === 'clear_ham') {
                        confidenceFill.classList.add('is-ham');
                    } else {
                        confidenceFill.classList.add('is-uncertain');
                    }
                    if (demoConfidenceHint) {
                        demoConfidenceHint.hidden = true;
                        demoConfidenceHint.textContent = '';
                    }
                    if (demoLatencyLine && result.trace && result.trace.inference_ms != null) {
                        demoLatencyLine.textContent =
                            '~' +
                            result.trace.inference_ms +
                            ' ms forward; highlights need extra passes.';
                        demoLatencyLine.hidden = false;
                    } else if (demoLatencyLine) {
                        demoLatencyLine.hidden = true;
                        demoLatencyLine.textContent = '';
                    }
                    if (result.offlineFallback && demoConfidenceHint) {
                        demoConfidenceHint.textContent = 'Offline keyword estimate (not the CNN).';
                        demoConfidenceHint.hidden = false;
                    }
                }
                signalsList.innerHTML = '';

                result.signals.forEach(function (signal) {
                    var label = typeof signal === 'string' ? signal : signal.reason;
                    var detail = typeof signal === 'string' ? '' : (signal.detail || '');
                    var opts = typeof signal === 'object' && signal ? signal._rowOpts : null;
                    signalsList.appendChild(buildSignalRow(label, detail, opts || {}));
                });

                renderHighlights(sourceText || '', result);

                var whySection = document.getElementById('demo-why-section');
                var whyList = document.getElementById('demo-why-list');
                var whySigList = document.getElementById('demo-why-signals');
                if (whySection && whyList && !result.apiError) {
                    var band = result.interpretation && result.interpretation.band;
                    var whyReasons = buildWhyReasons(result, result._clientSigs || [], sourceText || '');
                    whyList.innerHTML = '';
                    whyReasons.forEach(function (r) {
                        var li = document.createElement('li');
                        li.className = 'demo-why-item';
                        var dot = document.createElement('span');
                        dot.className = 'demo-why-dot';
                        dot.setAttribute('aria-hidden', 'true');
                        var txt = document.createElement('span');
                        txt.textContent = r;
                        li.appendChild(dot);
                        li.appendChild(txt);
                        whyList.appendChild(li);
                    });

                    // Rule signal cards (expandable details) inside why section
                    if (whySigList) {
                        whySigList.innerHTML = '';
                        var ruleSigs = (result._clientSigs || []).filter(function (s) { return !!s.family; });
                        ruleSigs.forEach(function (sig) {
                            whySigList.appendChild(buildSignalRow(sig.reason, sig.detail, {}));
                        });
                        whySigList.hidden = ruleSigs.length === 0;
                    }

                    var verdictAttr = band === 'clear_spam' ? 'spam' : band === 'clear_ham' ? 'ham' : 'uncertain';
                    whySection.setAttribute('data-verdict', verdictAttr);
                    whySection.hidden = whyReasons.length === 0;
                } else if (whySection) {
                    whySection.hidden = true;
                    if (whySigList) whySigList.hidden = true;
                }

                showResults(true);
            }

            function renderHighlights(text, result) {
                if (!highlightWrap || !highlightEl) return;
                if (!result || !result.highlightSpans || result.highlightSpans.length === 0) {
                    highlightWrap.hidden = true;
                    highlightEl.innerHTML = '';
                    highlightEl.setAttribute('aria-hidden', 'true');
                    if (highlightWhyEl) {
                        highlightWhyEl.hidden = true;
                        highlightWhyEl.textContent = '';
                    }
                    return;
                }
                if (highlightWhyEl) {
                    var b = result.interpretation && result.interpretation.band;
                    var lean = result.interpretation && result.interpretation.lean;
                    var why;
                    if (b === 'clear_spam') {
                        why = 'These words pushed P(bulk-style) up the most.';
                    } else if (b === 'uncertain' && lean === 'spam') {
                        why = 'Borderline score. These words nudged it toward bulk-style.';
                    } else if (b === 'uncertain' && lean === 'ham') {
                        why = 'Borderline. These words still pulled toward bulk-style, but not enough to cross the cutoff.';
                    } else {
                        why = 'Low bulk-style score. These words still had the most effect, even if small.';
                    }
                    highlightWhyEl.textContent = why;
                    highlightWhyEl.hidden = false;
                }
                highlightEl.innerHTML = buildHighlightHtml(text, result.highlightSpans);
                highlightWrap.hidden = false;
                highlightEl.setAttribute('aria-hidden', 'false');
                try {
                    var reduceMotion =
                        window.matchMedia &&
                        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    highlightWrap.scrollIntoView({
                        behavior: reduceMotion ? 'auto' : 'smooth',
                        block: 'nearest',
                    });
                } catch (e) {}
            }

            analyzeBtn.addEventListener('click', function () {
                var message = input.value.trim();
                if (!message) {
                    clearInferenceUI();
                    predictionText.textContent = 'Add a message first';
                    verdictBadge.setAttribute('data-verdict', 'neutral');
                    confidenceText.textContent = '-';
                    confidenceFill.style.width = '0%';
                    signalsList.innerHTML = '';
                    if (highlightWrap) highlightWrap.hidden = true;
                    if (highlightWhyEl) {
                        highlightWhyEl.hidden = true;
                        highlightWhyEl.textContent = '';
                    }
                    signalsList.appendChild(
                        buildSignalRow('No input', 'Enter a message in the text area, then select Analyze.')
                    );
                    showResults(true);
                    if (typeof trackGoatEvent === 'function') {
                        trackGoatEvent('event/demo/analyze-empty', 'SMS demo: analyze with no text');
                    }
                    return;
                }

                if (typeof trackGoatEvent === 'function') {
                    trackGoatEvent('funnel/demo/analyze', 'SMS demo: analyze submitted');
                }

                analyzeBtn.disabled = true;
                analyzeBtn.setAttribute('aria-busy', 'true');
                showAnalysisLoading();
                var url = getApiBase() + '/predict';
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: message })
                })
                    .then(function (r) {
                        if (!r.ok) {
                            return r.text().then(function (t) {
                                throw new Error(r.status + ' ' + (t || r.statusText));
                            });
                        }
                        return r.json();
                    })
                    .then(function (data) {
                        var result = parsePredictResponse(data);
                        var clientSigs = runClientSignals(message);
                        result._clientSigs = clientSigs;
                        applyRuleBoost(result, clientSigs);
                        renderResult(result, message);
                        refreshApiStatus();
                    })
                    .catch(function (err) {
                        var clientSigs = runClientSignals(message);
                        var fb = buildOfflineFallbackResult(message, err);
                        fb._clientSigs = clientSigs;
                        renderResult(fb, message);
                        refreshApiStatus();
                    })
                    .finally(function () {
                        analyzeBtn.disabled = false;
                        analyzeBtn.removeAttribute('aria-busy');
                    });
            });

            refreshApiStatus();
            initCredibilityBlock();

            if (inboxToggle && inboxPanel) {
                inboxToggle.addEventListener('click', function () {
                    inboxPanel.hidden = !inboxPanel.hidden;
                    inboxToggle.setAttribute('aria-expanded', String(!inboxPanel.hidden));
                });
            }

            if (batchRun && batchInput && batchStatus && batchResults) {
                batchRun.addEventListener('click', function () {
                    var lines = batchInput.value
                        .split('\n')
                        .map(function (s) {
                            return s.trim();
                        })
                        .filter(Boolean)
                        .slice(0, 8);
                    if (!lines.length) {
                        batchStatus.textContent = 'Add at least one non-empty line.';
                        batchResults.hidden = true;
                        batchResults.innerHTML = '';
                        return;
                    }
                    if (typeof trackGoatEvent === 'function') {
                        trackGoatEvent('funnel/demo/batch-run', 'SMS demo: batch ' + lines.length + ' lines');
                    }
                    batchRun.disabled = true;
                    batchStatus.textContent = '';
                    batchResults.hidden = true;
                    batchResults.innerHTML = '';

                    var rows = [];
                    var i = 0;

                    function step() {
                        if (i >= lines.length) {
                            var html =
                                '<div class="demo-batch-table-wrap"><table class="demo-batch-table"><thead><tr><th>#</th><th>Snippet</th><th>Verdict</th><th>P(bulk-style)</th></tr></thead><tbody>';
                            rows.forEach(function (r, ri) {
                                if (r.error) {
                                    html +=
                                        '<tr><td>' +
                                        (ri + 1) +
                                        '</td><td class="demo-batch-snippet">' +
                                        escapeHtml(r.snippet) +
                                        '</td><td class="demo-batch-label--err" colspan="2">' +
                                        escapeHtml(r.error) +
                                        '</td></tr>';
                                } else {
                                    var lblClass = 'demo-batch-label--ham';
                                    if (r.label.indexOf('Uncertain') === 0 || r.label.indexOf('Borderline') === 0) {
                                        lblClass = 'demo-batch-label--uncertain';
                                    } else if (r.label === 'Spam' || r.label === UI_LABEL.bulk) {
                                        lblClass = 'demo-batch-label--spam';
                                    }
                                    html +=
                                        '<tr><td>' +
                                        (ri + 1) +
                                        '</td><td class="demo-batch-snippet">' +
                                        escapeHtml(r.snippet) +
                                        '</td><td class="' +
                                        lblClass +
                                        '">' +
                                        escapeHtml(r.label) +
                                        '</td><td>' +
                                        escapeHtml(r.pct) +
                                        '</td></tr>';
                                }
                            });
                            html += '</tbody></table></div>';
                            batchResults.innerHTML = html;
                            batchResults.hidden = false;
                            batchStatus.textContent = 'Done: ' + lines.length + ' message(s).';
                            batchRun.disabled = false;
                            return;
                        }
                        var line = lines[i];
                        var snip = line.length > 60 ? line.slice(0, 60) + '\u2026' : line;
                        batchStatus.textContent = 'Scoring ' + (i + 1) + ' / ' + lines.length + '\u2026';
                        fetch(getApiBase() + '/predict', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: line })
                        })
                            .then(function (r) {
                                if (!r.ok) {
                                    return r.text().then(function (t) {
                                        throw new Error(r.status + ' ' + (t || r.statusText));
                                    });
                                }
                                return r.json();
                            })
                            .then(function (data) {
                                var res = parsePredictResponse(data);
                                var dp = displayProbabilityPercent(res.probability);
                                rows.push({
                                    snippet: snip,
                                    label: res.displayLabel != null ? res.displayLabel : mapApiLabelToDisplay(res.label),
                                    pct: dp.text
                                });
                                i++;
                                step();
                            })
                            .catch(function (err) {
                                rows.push({
                                    snippet: snip,
                                    error: err.message || String(err)
                                });
                                i++;
                                step();
                            });
                    }
                    step();
                });
            }

            randomBtn.addEventListener('click', function () {
                var sample = pickSample();
                input.value = sample.text;
                if (randomLabel) {
                    randomLabel.textContent = 'Sample loaded. Run Analyze to see P(bulk-style).';
                    randomLabel.removeAttribute('data-type');
                    randomLabel.hidden = false;
                }
                input.focus();
            });

            clearBtn.addEventListener('click', function () {
                clearInferenceUI();
                input.value = '';
                if (randomLabel) { randomLabel.hidden = true; randomLabel.textContent = ''; randomLabel.removeAttribute('data-type'); }
                showResults(false);
                predictionText.textContent = '-';
                verdictBadge.setAttribute('data-verdict', '');
                confidenceText.textContent = '-';
                confidenceFill.style.width = '0%';
                confidenceFill.classList.remove('is-spam', 'is-ham', 'is-uncertain');
                signalsList.innerHTML = '';
                if (highlightWrap) highlightWrap.hidden = true;
                if (highlightEl) highlightEl.innerHTML = '';
                if (highlightWhyEl) {
                    highlightWhyEl.hidden = true;
                    highlightWhyEl.textContent = '';
                }
                var whyClear = document.getElementById('demo-why-section');
                if (whyClear) { whyClear.hidden = true; whyClear.removeAttribute('data-verdict'); }
                var whySigClear = document.getElementById('demo-why-signals');
                if (whySigClear) { whySigClear.hidden = true; whySigClear.innerHTML = ''; }
                if (batchStatus) batchStatus.textContent = '';
                if (batchResults) {
                    batchResults.hidden = true;
                    batchResults.innerHTML = '';
                }
            });
            }); // loadClientConfig().finally
        });

        // How-it-works modal - injected directly into <body> to avoid stacking context issues
        (function () {
            var openBtn = document.getElementById('highlight-how-btn');
            if (!openBtn) return;

            var modal = document.createElement('div');
            modal.id = 'highlight-how-modal';
            modal.className = 'hiw-backdrop';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'hiw-title');
            modal.innerHTML = [
                '<div class="hiw-panel">',
                  '<button type="button" class="hiw-close" aria-label="Close">&times;</button>',
                  '<h2 class="hiw-title" id="hiw-title">How the word highlights work</h2>',
                  '<p class="hiw-lead">The model reads the whole message and outputs one number: <strong>P(bulk-style)</strong> (dataset spam label).',
                  ' Which words pushed that score? The highlights show that, not whether a message is "safe."</p>',
                  '<div class="hiw-step"><span class="hiw-step-num">1</span><div>',
                    '<strong>Score the full message</strong>',
                    '<p>The model reads every word together and produces P(bulk-style): resemblance to bulk/automation-like SMS in training.</p>',
                  '</div></div>',
                  '<div class="hiw-step"><span class="hiw-step-num">2</span><div>',
                    '<strong>Hide one word, score again</strong>',
                    '<p>The server covers up one word, re-runs the model, and records whether P(bulk-style) went up or down.</p>',
                  '</div></div>',
                  '<div class="hiw-step"><span class="hiw-step-num">3</span><div>',
                    '<strong>Repeat for every word</strong>',
                    '<p>Done once per word so each word gets an impact score.</p>',
                  '</div></div>',
                  '<div class="hiw-step"><span class="hiw-step-num">4</span><div>',
                    '<strong>Highlight the ones that mattered</strong>',
                    '<p>Words that changed the score the most are highlighted. Those words drove the model most on this message.</p>',
                  '</div></div>',
                  '<div class="hiw-analogy">',
                    '<span class="hiw-analogy-label">Analogy</span>',
                    '<p>Cover "FREE PRIZE" with your thumb: if the message suddenly sounds personal, those words carried the bulk-style signal.',
                    ' Covering "the" and seeing no change means that word barely mattered.</p>',
                  '</div>',
                  '<p class="hiw-footer-note">Hover a highlight to see how much P(bulk-style) moved when that word was hidden.</p>',
                '</div>'
            ].join('');
            document.body.appendChild(modal);

            var closeBtn = modal.querySelector('.hiw-close');

            function openModal() {
                modal.style.display = 'flex';
                document.body.classList.add('hiw-open');
                if (closeBtn) closeBtn.focus();
            }
            function closeModal() {
                modal.style.display = 'none';
                document.body.classList.remove('hiw-open');
                openBtn.focus();
            }

            openBtn.addEventListener('click', openModal);
            if (closeBtn) closeBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal();
            });
            document.addEventListener('keydown', function (e) {
                if (modal.style.display === 'flex' && e.key === 'Escape') closeModal();
            });
        })();

        // Resume PDF link tracking for GoatCounter
        document.querySelectorAll('a[href*="om-shah-resume.pdf"]').forEach(function (link) {
            link.addEventListener('click', function () {
                if (typeof trackGoatEvent === 'function') {
                    trackGoatEvent('resume-download', 'Resume (PDF)');
                }
            });
        });
