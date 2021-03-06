/**
 * Progress module.
 * 
 * @module progress
 */

import events from './event';

/**
 * Maintains progress state of user traversing through form, using
 * currently focused input or the last changed input as the indicator for the current location.
 */
export default {
    status: 0,
    lastChanged: null,
    all: null,
    updateTotal() {
        this.all = [ ...this.form.view.html.querySelectorAll( '.question:not(.disabled):not(.or-appearance-comment):not(.or-appearance-dn):not(.readonly)' ) ]
            .filter( question => !question.closest( '.disabled' ) );
    },
    /**
     * Updates rounded % value of progress and triggers event if changed.
     *
     * @param {Element} el
     */
    update( el ) {
        let status;

        if ( !this.all || !el ) {
            this.updateTotal();
        }

        this.lastChanged = el || this.lastChanged;
        if ( this.lastChanged ) {
            status = Math.round( ( ( this.all.indexOf( this.lastChanged.closest( '.question' ) ) + 1 ) * 100 ) / this.all.length );
        }

        // if the current el was removed (inside removed repeat), the status will be 0 - leave unchanged
        if ( status > 0 && status !== this.status ) {
            this.status = status;
            this.form.view.html.dispatchEvent( events.ProgressUpdate( status ) );
        }
    },
    /**
     * @returns string
     */
    get() {
        return this.status;
    }
};
