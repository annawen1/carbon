/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';
import { defineCustomElement } from '@carbon/web-components/es/globals/register.js';
// import class (pure) - no registration
import CDSAccordion from '@carbon/web-components/es/components/accordion/accordion.js';

describe('component registration', () => {
  describe('import behavior', () => {
    it('is side-effect free (registers nothing) when importing a class file ', () => {
      expect(customElements.get('cds-accordion')).to.be.undefined;
    });

    it('registers the element importing the component barrel', async () => {
      await import('@carbon/web-components/es/components/accordion/index.js');
      expect(customElements.get('cds-accordion')).to.equal(CDSAccordion);
    });
  });

  describe('defineCustomElement', () => {
    it('registers under the class static `is` by default', () => {
      class El extends HTMLElement {
        static is = 'reg-test-default';
      }
      defineCustomElement(El);
      expect(customElements.get('reg-test-default')).to.equal(El);
    });

    it('registers under a custom `name`', () => {
      class El extends HTMLElement {
        static is = 'reg-test-isname';
      }
      defineCustomElement(El, { name: 'reg-test-customname' });
      expect(customElements.get('reg-test-customname')).to.equal(El);
      expect(customElements.get('reg-test-isname'), 'default `is` not used').to
        .be.undefined;
    });

    it('routes to a provided `registry`, leaving the global registry untouched', () => {
      const calls = [];
      const registry = {
        get: () => undefined,
        define: (name, clazz) => calls.push([name, clazz]),
      };
      class El extends HTMLElement {
        static is = 'reg-test-scoped';
      }
      defineCustomElement(El, { registry });

      expect(calls, 'defined into the provided registry').to.deep.equal([
        ['reg-test-scoped', El],
      ]);
      expect(customElements.get('reg-test-scoped'), 'global registry untouched')
        .to.be.undefined;
    });

    it('is idempotent - re-defining an existing tag is a no-op', () => {
      class El extends HTMLElement {
        static is = 'reg-test-idem';
      }
      defineCustomElement(El);
      expect(() => defineCustomElement(El)).to.not.throw();
      expect(customElements.get('reg-test-idem')).to.equal(El);
    });

    it('returns the class for convenient re-export', () => {
      class El extends HTMLElement {
        static is = 'reg-test-return';
      }
      expect(defineCustomElement(El)).to.equal(El);
    });
  });
});
