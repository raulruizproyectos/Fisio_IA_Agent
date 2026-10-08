
      /* === ICON LIGATURE TO UNICODE FIX === */
      (() => {
        const M={home:'\ue88a',group:'\ue7ef',calendar_today:'\ue935',calendar_month:'\ue935',prescriptions:'\uf0e3',payments:'\uef63',account_balance:'\ue84f',receipt_long:'\uef6b',receipt:'\ue8b0',confirmation_number:'\ue638',card_giftcard:'\ue8f6',forward_to_inbox:'\uf187',folder_open:'\ue2c8',settings:'\ue8b8',menu:'\ue5d2',psychology:'\uea4a',neurology:'\ue138',event_available:'\ue614',euro:'\uea15',person:'\ue7fd',person_add:'\ue7fe',person_search:'\uf106',person_off:'\ue510',close:'\ue5cd',picture_as_pdf:'\ue415',electric_bolt:'\uec1c',arrow_upward:'\ue5d8',arrow_forward:'\ue5c8',arrow_back:'\ue5c4',arrow_outward:'\uf8ce',medical_services:'\uf109',right_panel_open:'\uf7cf',notifications:'\ue7f4',search:'\ue8b6',report:'\ue160',refresh:'\ue5d5',sync:'\ue627',edit:'\ue3c9',delete:'\ue872',save:'\ue161',add:'\ue145',add_card:'\ueb86',check:'\ue5ca',visibility:'\ue8f4',visibility_off:'\ue8f5',expand_more:'\ue5cf',expand_less:'\ue5ce',content_copy:'\ue14d',done:'\ue876',info:'\ue88e',warning:'\ue002',error:'\ue000',help:'\ue887',smart_toy:'\uefff',description:'\ue873',assignment:'\ue85d',library_books:'\ue02f',check_circle:'\ue86c',cancel:'\ue5c9',more_vert:'\ue5d4',star:'\ue838',favorite:'\ue87d',schedule:'\ue8b5',place:'\ue55f',phone:'\ue0cd',call:'\uf0d4',email:'\ue0be',mail:'\ue158',chat:'\ue0b7',send:'\ue163',attach_file:'\ue226',download:'\uf090',upload:'\uf09b',print:'\ue8ad',share:'\ue80d',link:'\ue157',open_in_new:'\ue89e',fullscreen:'\ue5d0',zoom_in:'\ue8ff',zoom_out:'\ue900',undo:'\ue166',redo:'\ue15a',filter_list:'\ue152',sort:'\ue164',drag_indicator:'\ue945',chevron_left:'\ue5cb',chevron_right:'\ue5cc',keyboard_arrow_down:'\ue313',keyboard_arrow_up:'\ue316',first_page:'\ue5dc',last_page:'\ue5dd',navigate_before:'\ue408',navigate_next:'\ue409',radio_button_unchecked:'\ue836',radio_button_checked:'\ue837',check_box:'\ue834',check_box_outline_blank:'\ue835',indeterminate_check_box:'\ue909',toggle_on:'\ue9f6',toggle_off:'\ue9f5',lock:'\ue897',lock_open:'\ue898',verified:'\uef76',task_alt:'\ue2e6',pending:'\uef64',hourglass_empty:'\ue88b',hourglass_top:'\ue88b',timer:'\ue425',update:'\ue923',history:'\ue889',trending_up:'\ue8e5',trending_down:'\ue8e3',bar_chart:'\ue26b',pie_chart:'\ue6c4',analytics:'\uef3e',dashboard:'\ue871',inventory:'\ue179',local_hospital:'\ue548',healing:'\ue3f3',fitness_center:'\ueb43',accessibility_new:'\ue92c',self_improvement:'\uea78',spa:'\ueb4c',sports:'\uea30',directions_run:'\ue566',elderly:'\uf21a',restart_alt:'\uf053',draw:'\ue746',robot_2:'\uf5d0',clinical_notes:'\uf1dc',note_add:'\ue89c',cloud_off:'\ue2c1'};
        const fix = () => {
          document.querySelectorAll('.material-symbols-rounded').forEach(el => {
            const t = el.textContent.trim();
            if (M[t]) el.textContent = M[t];
          });
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix);
        else fix();
        new MutationObserver(muts => {
          for (const m of muts) {
            for (const n of m.addedNodes) {
              if (n.nodeType === 1) {
                if (n.classList?.contains('material-symbols-rounded')) {
                  const t = n.textContent.trim();
                  if (M[t]) n.textContent = M[t];
                }
                n.querySelectorAll?.('.material-symbols-rounded')?.forEach(el => {
                  const t = el.textContent.trim();
                  if (M[t]) el.textContent = M[t];
                });
              }
            }
          }
        }).observe(document.documentElement, {childList: true, subtree: true});
      })();


      (() => {
        const MOJIBAKE_RE = /(?:\u00C3|\u00C2|\u00E2|\u00F0|\u00D0|\u00D1|\uFFFD|\u0152|\u0153|\u0161|\u0178|\u00EF\u00BF\u00BD)/;
        const CP1252_UNICODE_TO_BYTE = {
          0x20ac: 0x80,
          0x201a: 0x82,
          0x0192: 0x83,
          0x201e: 0x84,
          0x2026: 0x85,
          0x2020: 0x86,
          0x2021: 0x87,
          0x02c6: 0x88,
          0x2030: 0x89,
          0x0160: 0x8a,
          0x2039: 0x8b,
          0x0152: 0x8c,
          0x017d: 0x8e,
          0x2018: 0x91,
          0x2019: 0x92,
          0x201c: 0x93,
          0x201d: 0x94,
          0x2022: 0x95,
          0x2013: 0x96,
          0x2014: 0x97,
          0x02dc: 0x98,
          0x2122: 0x99,
          0x0161: 0x9a,
          0x203a: 0x9b,
          0x0153: 0x9c,
          0x017e: 0x9e,
          0x0178: 0x9f,
        };

        const toLegacyBytes = (text) => {
          const bytes = [];
          for (const ch of text) {
            const code = ch.codePointAt(0);
            if (typeof code !== 'number') continue;
            if (code <= 0xff) {
              bytes.push(code);
              continue;
            }
            const mapped = CP1252_UNICODE_TO_BYTE[code];
            if (typeof mapped === 'number') {
              bytes.push(mapped);
              continue;
            }
            return null;
          }
          return new Uint8Array(bytes);
        };

        const decodeUtf8Bytes = (bytes) => {
          try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          } catch {
            try {
              return new TextDecoder('utf-8').decode(bytes);
            } catch {
              return '';
            }
          }
        };

        const decodeMojibake = (value) => {
          let current = String(value ?? '');
          if (!MOJIBAKE_RE.test(current)) return current;

          for (let pass = 0; pass < 3; pass += 1) {
            const bytes = toLegacyBytes(current);
            if (!bytes) break;
            const decoded = decodeUtf8Bytes(bytes);
            if (!decoded || decoded === current) break;
            current = decoded;
            if (!MOJIBAKE_RE.test(current)) break;
          }

          return typeof current.normalize === 'function' ? current.normalize('NFC') : current;
        };

        const sanitizeTextNode = (node) => {
          const original = node.nodeValue || '';
          if (!MOJIBAKE_RE.test(original)) return;
          const fixed = decodeMojibake(original);
          if (fixed && fixed !== original) node.nodeValue = fixed;
        };

        const sanitizeAttributes = (element) => {
          if (!element || typeof element.getAttribute !== 'function') return;
          const attrs = ['title', 'aria-label', 'placeholder', 'alt'];
          attrs.forEach((attr) => {
            const original = element.getAttribute(attr);
            if (!original || !MOJIBAKE_RE.test(original)) return;
            const fixed = decodeMojibake(original);
            if (fixed && fixed !== original) element.setAttribute(attr, fixed);
          });
        };

        const sanitizeTree = (root) => {
          if (!root) return;
          if (root.nodeType === Node.TEXT_NODE) {
            sanitizeTextNode(root);
            return;
          }
          if (root.nodeType === Node.ELEMENT_NODE) {
            sanitizeAttributes(root);
            const nodeList = root.querySelectorAll
              ? root.querySelectorAll('[title],[aria-label],[placeholder],[alt]')
              : [];
            nodeList.forEach((node) => sanitizeAttributes(node));
          }
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          let current = walker.nextNode();
          while (current) {
            sanitizeTextNode(current);
            current = walker.nextNode();
          }
        };

        const sanitizeDocument = () => {
          document.title = decodeMojibake(document.title);
          sanitizeTree(document.body);
        };

        sanitizeDocument();

        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'characterData' && mutation.target) {
              sanitizeTextNode(mutation.target);
              return;
            }
            if (mutation.type === 'attributes' && mutation.target) {
              sanitizeAttributes(mutation.target);
              return;
            }
            mutation.addedNodes.forEach((node) => sanitizeTree(node));
          });
        });

        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['title', 'aria-label', 'placeholder', 'alt'],
        });
      })();
