/**
 * Fills the "Alexa+ Skills Nomination Form" (Qualtrics).
 *
 * Paste the whole file into the browser console on
 * https://amazonexteu.qualtrics.com/jfe/form/SV_2i8dxS8a5Nv84PY
 *
 * It fills the fields and stops. It does NOT submit — read everything over, then press the
 * form's own button yourself.
 *
 * Qualtrics is a React app, so assigning `input.value` alone is ignored: React tracks the last
 * value it set on the node and skips the update. Each field therefore goes through the native
 * value setter and then gets an `input` event, which is what React actually listens to.
 */
(() => {
    'use strict';

    // ---------------------------------------------------------------------------------------
    // Edit these, then run.
    // ---------------------------------------------------------------------------------------
    const CONFIG = {
        firstName: 'Juan Manuel',
        lastName: 'Bécares',
        // Use the address the Amazon developer account is registered under — Amazon replies here,
        // and it has to match the account that owns the Vendor ID below.
        email: 'FILL-ME@example.com',
        // No company: an individual developer account. Amazon accepts the developer name here.
        companyName: 'Juan Manuel Bécares',
        vendorId: 'MNTMNI6XZXA27',
        vendorCountry: 'Spain',

        // The form offers only en-US, en-CA, es-MX, en-GB and it-IT — es-ES is not on the list.
        // The question is not marked required, so null leaves it blank, which is honest.
        // Set it to one of the five only if you decide to claim a locale you do not ship.
        locale: null,

        // Up to 10. Skill Name is what the store shows; Skill ID is the amzn1.ask.skill.… value.
        skills: [
            { name: 'Bus Salamanca', id: 'amzn1.ask.skill.ec146a34-f92a-4889-893f-c245bedfd6cc' },
        ],

        // The consent radio is required, so the form cannot be submitted without it.
        consent: true,
    };

    // ---------------------------------------------------------------------------------------

    const report = [];

    /** Writes to a React-controlled input so the framework registers the change. */
    function setInput(el, value, label) {
        if (!el) {
            report.push({ field: label, status: 'NOT FOUND', value: '' });
            return false;
        }
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        // Qualtrics validates required fields on blur.
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        report.push({ field: label, status: 'ok', value });
        return true;
    }

    /** The top-level text questions each hold exactly one input inside their own section. */
    function questionInput(qid) {
        return document.querySelector(`#question-${qid} input.text-input`);
    }

    setInput(questionInput('QID4'), CONFIG.firstName, 'First Name');
    setInput(questionInput('QID7'), CONFIG.lastName, 'Last Name');
    setInput(questionInput('QID8'), CONFIG.email, 'Email Address');
    setInput(questionInput('QID9'), CONFIG.companyName, 'Company Name');
    setInput(questionInput('QID10'), CONFIG.vendorId, 'Vendor ID');
    setInput(questionInput('QID11'), CONFIG.vendorCountry, 'Vendor Country');

    // Locale radio (QID14). Matched on the visible label rather than a choice number, because
    // the numbering skips 3 and could be renumbered by Qualtrics at any time.
    if (CONFIG.locale) {
        const choice = [...document.querySelectorAll('#question-QID14 .choice-label')]
            .find(l => l.textContent.trim() === CONFIG.locale);
        if (choice) {
            choice.click();
            report.push({ field: 'Locale', status: 'ok', value: CONFIG.locale });
        } else {
            const offered = [...document.querySelectorAll('#question-QID14 .choice-label')]
                .map(l => l.textContent.trim()).join(', ');
            report.push({ field: 'Locale', status: `NOT OFFERED (form has: ${offered})`, value: CONFIG.locale });
        }
    } else {
        report.push({ field: 'Locale', status: 'left blank (not required)', value: '' });
    }

    // Skills matrix (QID5). Row n is statement 10 + n: Skill 1 is …-11-…, Skill 2 is …-12-….
    // Column 1 is Skill Name, column 2 is Skill ID.
    CONFIG.skills.slice(0, 10).forEach((skill, index) => {
        const row = 11 + index;
        setInput(document.querySelector(`#sbs-QID5-${row}-1-1-input`), skill.name, `Skill ${index + 1} name`);
        setInput(document.querySelector(`#sbs-QID5-${row}-1-2-input`), skill.id, `Skill ${index + 1} ID`);
    });

    if (CONFIG.skills.length > 10) {
        report.push({ field: 'Skills', status: `ONLY FIRST 10 FILLED (${CONFIG.skills.length} given)`, value: '' });
    }

    // Consent radio (QID6) — required.
    if (CONFIG.consent) {
        const yes = document.querySelector('#mc-choice-input-QID6-1');
        if (yes) {
            yes.click();
            report.push({ field: 'Consent', status: 'ok', value: 'Yes' });
        } else {
            report.push({ field: 'Consent', status: 'NOT FOUND', value: '' });
        }
    }

    console.table(report);

    if (CONFIG.email.includes('FILL-ME')) {
        console.warn('Email is still the placeholder — set CONFIG.email before submitting.');
    }

    const problems = report.filter(r => r.status !== 'ok' && !r.status.startsWith('left blank'));
    if (problems.length) {
        console.warn(`${problems.length} field(s) need your attention — see the rows above.`);
    }
    console.log('Nothing was submitted. Check every field on screen, then press the form button yourself.');
})();
