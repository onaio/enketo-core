/* global describe, require, it, xit, beforeEach, expect, spyOn, beforeAll, afterAll*/

'use strict';

var Form = require( '../../src/js/Form' );
var $ = require( 'jquery' );
var forms = require( '../mock/forms' );

var loadForm = function( filename, editStr, options, session ) {
    var strings = forms[ filename ];
    return new Form( strings.html_form, {
        modelStr: strings.xml_model,
        instanceStr: editStr,
        session: session || {}
    }, options );
};

describe( 'Output functionality ', function() {
    // These tests were orginally meant for modilabs/enketo issue #141. However, they passed when they were
    // failing in the enketo client itself (same form). It appeared the issue was untestable (except manually)
    // since the issue was resolved by updating outputs with a one millisecond delay (!).
    // Nevertheless, these tests can be useful.
    var form = loadForm( 'random.xml' );

    form.init();

    it( 'tested upon initialization: node random__', function() {
        expect( form.view.$.find( '[data-value="/random/random__"]' ).text().length ).toEqual( 17 );
    } );

    it( 'tested upon initialization: node uuid__', function() {
        expect( form.view.$.find( '[data-value="/random/uuid__"]' ).text().length ).toEqual( 36 );
    } );
} );

describe( 'Output functionality within repeats', function() {
    var $o = [];
    var form = loadForm( 'outputs_in_repeats.xml' );
    form.init();
    form.view.$.find( '.add-repeat-btn' ).click();

    $o = form.view.$.find( '.or-output' );

    form.view.$.find( '[name="/outputs_in_repeats/rep/name"]' ).eq( 0 ).val( 'Martijn' ).trigger( 'change' );
    form.view.$.find( '[name="/outputs_in_repeats/rep/name"]' ).eq( 1 ).val( 'Beth' ).trigger( 'change' );
    form.view.$.find( '[data-name="/outputs_in_repeats/rep/animal"][value="elephant"]' ).eq( 0 ).prop( 'checked', true ).trigger( 'change' );
    form.view.$.find( '[data-name="/outputs_in_repeats/rep/animal"][value="rabbit"]' ).eq( 1 ).prop( 'checked', true ).trigger( 'change' );

    it( 'shows correct value when referring to repeated node', function() {
        expect( $o[ 0 ].textContent ).toEqual( 'Martijn' );
        expect( $o[ 1 ].textContent ).toEqual( 'Martijn' );
        expect( $o[ 2 ].textContent ).toEqual( 'elephant' );
        expect( $o[ 3 ].textContent ).toEqual( 'Martijn' );
        expect( $o[ 4 ].textContent ).toEqual( 'Beth' );
        expect( $o[ 5 ].textContent ).toEqual( 'Beth' );
        expect( $o[ 6 ].textContent ).toEqual( 'rabbit' );
        expect( $o[ 7 ].textContent ).toEqual( 'Beth' );
    } );
} );

describe( 'Preload and MetaData functionality', function() {
    var form, t;

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'ignores a calculate binding on /[ROOT]/meta/instanceID', function() {
        form = loadForm( 'random.xml' );
        form.init();
        expect( form.model.node( '/random/meta/instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
    } );

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'ignores a calculate binding on [ROOT]/orx:meta/orx:instanceID', function() {
        form = loadForm( 'meta-namespace.xml' );
        form.init();
        expect( form.model.node( '/data/orx:meta/orx:instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
    } );

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'generates an instanceID on /[ROOT]/meta/instanceID WITHOUT preload binding', function() {
        form = loadForm( 'random.xml' );
        form.init();
        form.view.$.find( 'fieldset#or-preload-items' ).remove();
        expect( form.view.$.find( 'fieldset#or-preload-items' ).length ).toEqual( 0 );
        expect( form.model.node( '/random/meta/instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
    } );

    // Form.js no longer has anything to do with /meta/instanceID population. Test should still pass though.
    it( 'generates an instanceID WITH a preload binding', function() {
        form = loadForm( 'preload.xml' );
        form.init();
        expect( form.view.$
                .find( 'fieldset#or-preload-items input[name="/preload/meta/instanceID"][data-preload="uid"]' ).length )
            .toEqual( 1 );
        expect( form.model.node( '/preload/meta/instanceID' ).getVal()[ 0 ].length ).toEqual( 41 );
    } );

    // Form.js no longer has anything to do with instanceID population. Test should still pass though.
    it( 'does not generate a new instanceID if one is already present', function() {
        form = new Form( forms[ 'random.xml' ].html_form, {
            modelStr: forms[ 'random.xml' ].xml_model.replace( '<instanceID/>', '<instanceID>existing</instanceID>' )
        } );
        form.init();
        expect( form.model.node( '/random/meta/instanceID' ).getVal()[ 0 ] ).toEqual( 'existing' );
    } );

    it( 'generates a timeStart on /[ROOT]/meta/timeStart WITH a preload binding', function() {
        form = loadForm( 'preload.xml' );
        form.init();
        expect( form.model.node( '/preload/start' ).getVal()[ 0 ].length > 10 ).toBe( true );
    } );

    it( 'generates a timeEnd on init and updates this after a beforesave event WITH a preload binding', function( done ) {
        var timeEnd;
        var timeEndNew;

        form = loadForm( 'preload.xml' );
        form.init();
        timeEnd = form.model.node( '/preload/end' ).getVal()[ 0 ];

        // populating upon initalization is not really a feature, could be removed perhaps
        expect( timeEnd.length > 10 ).toBe( true );

        setTimeout( function() {
            form.view.$.trigger( 'beforesave' );
            timeEndNew = form.model.node( '/preload/end' ).getVal()[ 0 ];
            //expect( new Date( timeEnd ) < new Date( timeEndNew ) ).toBe( true );
            expect( new Date( timeEndNew ) - new Date( timeEnd ) ).toEqual( 1000 );
            done();
        }, 1000 );

    } );

    it( 'also works with nodes that have a corresponding form control element', function() {
        form = loadForm( 'preload-input.xml' );
        form.init();

        [ '/dynamic-default/two', '/dynamic-default/four', '/dynamic-default/six' ].forEach( function( path ) {
            expect( form.view.$.find( '[name="' + path + '"]' ).val().length > 9 ).toBe( true );
            expect( form.model.node( path ).getVal()[ 0 ].length > 9 ).toBe( true );
        } );
    } );

    it( 'some session context can be passed to the data.session property when instantiating form', function() {
        var session = {
            deviceid: 'a',
            username: 'b',
            email: 'c',
            phonenumber: 'd',
            simserial: 'e',
            subscriberid: 'f'
        };
        form = loadForm( 'preload.xml', undefined, undefined, session );
        form.init();

        [ 'deviceid', 'username', 'email', 'phonenumber', 'simserial', 'subscriberid' ].forEach( function( prop ) {
            expect( form.model.node( '/preload/' + prop ).getVal()[ 0 ] ).toEqual( session[ prop ] );
        } );
    } );

    function testPreloadExistingValue( node ) {
        it( 'obtains unchanged preload value of item (WITH preload binding): ' + node.selector + '', function() {
            form = new Form( forms[ 'preload.xml' ].html_form, {
                modelStr: '<preload>' +
                    '<start>2012-10-30T08:44:57.000-06</start>' +
                    '<end>2012-10-30T08:44:57.000-06:00</end>' +
                    '<today>2012-10-30</today>' +
                    '<deviceid>some value</deviceid>' +
                    '<subscriberid>some value</subscriberid>' +
                    '<imei>2332</imei>' +
                    '<phonenumber>234234324</phonenumber>' +
                    '<application>some context</application>' +
                    '<patient>this one</patient>' +
                    '<username>John Doe</username>' +
                    '<browser_name>fake</browser_name>' +
                    '<browser_version>xx</browser_version>' +
                    '<os_name>fake</os_name>' +
                    '<os_version>xx</os_version>' +
                    '<unknown>some value</unknown>' +
                    '<meta><instanceID>uuid:56c19c6c-08e6-490f-a783-e7f3db788ba8</instanceID></meta>' +
                    '</preload>'
            } );
            form.init();
            expect( form.model.node( node.selector ).getVal()[ 0 ] ).toEqual( node.result );
        } );
    }

    function testPreloadNonExistingValue( node ) {
        it( 'populates previously empty preload item (WITH preload binding): ' + node.selector + '', function() {
            form = loadForm( 'preload.xml' );
            form.init();
            expect( form.model.node( node.selector ).getVal()[ 0 ].length > 0 ).toBe( true );
        } );
    }

    t = [
        [ '/preload/start', '2012-10-30T08:44:57.000-06:00' ],
        [ '/preload/today', '2012-10-30' ],
        [ '/preload/deviceid', 'some value' ],
        [ '/preload/subscriberid', 'some value' ],
        [ '/preload/imei', '2332' ],
        [ '/preload/phonenumber', '234234324' ],
        //[ '/preload/application', 'some context' ],
        //[ '/preload/patient', 'this one' ],
        //[ '/preload/username', 'John Doe' ],
        //[ '/preload/meta/instanceID', 'uuid:56c19c6c-08e6-490f-a783-e7f3db788ba8' ],
        //['/widgets/browser_name', 'fake'],
        //['/widgets/browser_version', 'xx'],
        //['/widgets/os_name', 'fake'],
        //['/widgets/os_version', 'xx'],
    ];

    for ( var i = 0; i < t.length; i++ ) {
        testPreloadExistingValue( {
            selector: t[ i ][ 0 ],
            result: t[ i ][ 1 ]
        } );
        testPreloadNonExistingValue( {
            selector: t[ i ][ 0 ]
        } );
    }
    testPreloadNonExistingValue( {
        selector: '/preload/end'
    } );
} );

describe( 'Loading instance values into html input fields functionality', function() {
    var form;

    it( 'correctly populates input fields of non-repeat node names in the instance', function() {
        form = loadForm( 'thedata.xml' );
        form.init();
        expect( form.view.$.find( '[name="/thedata/nodeB"]' ).val() ).toEqual( 'b' );
        expect( form.view.$.find( '[name="/thedata/repeatGroup/nodeC"]' ).eq( 2 ).val() ).toEqual( 'c3' );
        expect( form.view.$.find( '[name="/thedata/nodeX"]' ).val() ).toEqual( undefined );
    } );

    it( 'correctly populates input field even if the instance node name is not unique and occurs at multiple levels', function() {
        form = loadForm( 'nodename.xml' );
        form.init();
        expect( form.view.$.find( '[name="/nodename_bug/hh/hh"]' ).val() ).toEqual( 'hi' );
    } );

    // https://github.com/kobotoolbox/enketo-express/issues/718
    it( 'correctly populates if the first radiobutton or first checkbox only has a value', function() {
        form = loadForm( 'issue208.xml' );
        form.init();
        form.input.setVal( '/issue208/rep/nodeA', 0, 'yes' );
        expect( form.view.$.find( '[data-name="/issue208/rep/nodeA"]' ).eq( 0 ).is( ':checked' ) ).toBe( true );
    } );

} );

describe( 'repeat functionality', function() {
    var form;

    //turn jQuery animations off
    $.fx.off = true;

    describe( 'cloning', function() {
        beforeEach( function() {
            form = loadForm( 'thedata.xml' ); //new Form(forms2.formStr1, forms2.dataStr1);
            form.init();
        } );

        it( 'removes the correct instance and HTML node when the ' - ' button is clicked (issue 170)', function() {
            var repeatSelector = '.or-repeat[name="/thedata/repeatGroup"]',
                nodePath = '/thedata/repeatGroup/nodeC',
                nodeSelector = 'input[name="' + nodePath + '"]',
                formH = form.view,
                data = form.model,
                index = 2;

            expect( formH.$.find( repeatSelector ).eq( index ).length ).toEqual( 1 );
            expect( formH.$.find( repeatSelector ).eq( index ).find( 'button.remove' ).length ).toEqual( 1 );
            expect( formH.$.find( nodeSelector ).eq( index ).val() ).toEqual( 'c3' );
            expect( data.node( nodePath, index ).getVal()[ 0 ] ).toEqual( 'c3' );

            formH.$.find( repeatSelector ).eq( index ).find( 'button.remove' ).click();
            expect( data.node( nodePath, index ).getVal()[ 0 ] ).toEqual( undefined );
            //check if it removed the correct data node
            expect( data.node( nodePath, index - 1 ).getVal()[ 0 ] ).toEqual( 'c2' );
            //check if it removed the correct html node
            expect( formH.$.find( repeatSelector ).eq( index ).length ).toEqual( 0 );
            expect( formH.$.find( nodeSelector ).eq( index - 1 ).val() ).toEqual( 'c2' );
        } );

        it( 'marks cloned invalid fields as valid', function() {
            var repeatSelector = '.or-repeat[name="/thedata/repeatGroup"]',
                repeatButton = '.add-repeat-btn',
                nodeSelector = 'input[name="/thedata/repeatGroup/nodeC"]',
                $node3 = form.view.$.find( nodeSelector ).eq( 2 ),
                $node4;

            form.setInvalid( $node3 );

            expect( form.view.$.find( repeatSelector ).length ).toEqual( 3 );
            expect( $node3.parent().hasClass( 'invalid-constraint' ) ).toBe( true );
            expect( form.view.$.find( nodeSelector ).eq( 3 ).length ).toEqual( 0 );

            form.view.$.find( repeatButton ).click();

            $node4 = form.view.$.find( nodeSelector ).eq( 3 );
            expect( form.view.$.find( repeatSelector ).length ).toEqual( 4 );
            expect( $node4.length ).toEqual( 1 );
            expect( $node4.parent().hasClass( 'invalid-constraint' ) ).toBe( false );
        } );
    } );

    it( 'clones a repeat view element on load when repeat has dot in nodeName and has multiple instances in XForm', function() {
        form = loadForm( 'repeat-dot.xml' );
        form.init();
        expect( form.view.$.find( 'input[name="/repeat-dot/rep.dot/a"]' ).length ).toEqual( 2 );
    } );

    it( 'clones nested repeats if they are present in the instance upon initialization (issue #359) ', function() {
        //note that this form contains multiple repeats in the instance
        form = loadForm( 'nested_repeats.xml' );
        form.init();
        var $1stLevelTargetRepeat = form.view.$.find( '.or-repeat[name="/nested_repeats/kids/kids_details"]' );
        var $2ndLevelTargetRepeats1 = $1stLevelTargetRepeat.eq( 0 ).find( '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]' );
        var $2ndLevelTargetRepeats2 = $1stLevelTargetRepeat.eq( 1 ).find( '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]' );
        expect( $1stLevelTargetRepeat.length ).toEqual( 2 );
        expect( $2ndLevelTargetRepeats1.length ).toEqual( 2 );
        expect( $2ndLevelTargetRepeats2.length ).toEqual( 3 );
    } );

    //https://github.com/kobotoolbox/enketo-express/issues/754
    it( 'shows the correct number of nested repeats in the view if a record is loaded', function() {
        var instanceStr = '<q><PROGRAMME><PROJECT><Partner><INFORMATION><Partner_Name>a</Partner_Name><Camp><P_Camps>a1</P_Camps></Camp><Camp><P_Camps>a2</P_Camps></Camp></INFORMATION></Partner><Partner><INFORMATION><Partner_Name>b</Partner_Name><Camp><P_Camps>b1</P_Camps></Camp><Camp><P_Camps>b2</P_Camps></Camp><Camp><P_Camps>b3</P_Camps></Camp></INFORMATION></Partner></PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>';
        var a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        var b = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        form = loadForm( 'nested-repeats-nasty.xml', instanceStr );
        form.init();

        expect( form.view.$.find( a ).length ).toEqual( 2 );
        expect( form.view.$.find( a ).eq( 0 ).find( b ).length ).toEqual( 2 );
        expect( form.view.$.find( a ).eq( 1 ).find( b ).length ).toEqual( 3 );

    } );

    it( 'ignores the "minimal" appearance when an existing record is loaded (almost same as previous test)', function() {
        var form;
        var instanceStr = '<q><PROGRAMME><PROJECT><Partner><INFORMATION><Partner_Name>a</Partner_Name><Camp><P_Camps>a1</P_Camps></Camp><Camp><P_Camps>a2</P_Camps></Camp></INFORMATION></Partner><Partner><INFORMATION><Partner_Name>b</Partner_Name><Camp><P_Camps>b1</P_Camps></Camp><Camp><P_Camps>b2</P_Camps></Camp><Camp><P_Camps>b3</P_Camps></Camp></INFORMATION></Partner></PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>';
        var a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        var b = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        forms[ 'nested-repeats-nastier' ] = {
            xml_model: forms[ 'nested-repeats-nasty.xml' ].xml_model
        };
        // both repeats get the 'minimal appearance'
        forms[ 'nested-repeats-nastier' ].html_form = forms[ 'nested-repeats-nasty.xml' ].html_form.replace( "class=\"or-repeat ", "class=\"or-repeat or-appearance-minimal " );
        form = loadForm( 'nested-repeats-nastier', instanceStr );
        form.init();

        expect( form.view.$.find( a ).length ).toEqual( 2 );
        expect( form.view.$.find( a ).hasClass( 'or-appearance-minimal' ) ).toEqual( true );
        expect( form.view.$.find( a ).eq( 0 ).find( b ).length ).toEqual( 2 );
        expect( form.view.$.find( a ).eq( 1 ).find( b ).length ).toEqual( 3 );
    } );

    it( 'uses the "minimal" appearance for an empty form to create 0 repeats', function() {
        var form;
        var a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        forms[ 'nested-repeats-nastier' ] = {
            xml_model: forms[ 'nested-repeats-nasty.xml' ].xml_model
        };
        // both repeats get the 'minimal appearance'
        forms[ 'nested-repeats-nastier' ].html_form = forms[ 'nested-repeats-nasty.xml' ].html_form.replace( "class=\"or-repeat ", "class=\"or-repeat or-appearance-minimal " );
        form = loadForm( 'nested-repeats-nastier' );
        form.init();

        expect( form.view.$.find( a ).length ).toEqual( 0 );
    } );

    it( 'In an empty form it creates the first repeat instance automatically (almost same as previous test)', function() {
        var form = loadForm( 'nested-repeats-nasty.xml' );
        var a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        var b = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        form.init();

        expect( form.view.$.find( a ).length ).toEqual( 1 );
        expect( form.view.$.find( a ).hasClass( 'or-appearance-minimal' ) ).toEqual( false );
        expect( form.view.$.find( a ).eq( 0 ).find( b ).length ).toEqual( 1 );
    } );

    it( 'doesn\'t duplicate date widgets in a cloned repeat', function() {
        form = loadForm( 'nested_repeats.xml' );
        form.init();
        var $dates = form.view.$.find( '[name="/nested_repeats/kids/kids_details/immunization_info/date"]' );

        expect( $dates.length ).toEqual( 5 );
        // for some reason these widgets are not instantiated here
        expect( $dates.parent().find( '.widget.date' ).length ).toEqual( 5 );
    } );

    describe( 'ordinals are set for default repeat instances in the default model upon initialization', function() {
        var config = require( 'enketo-config' );
        var dflt = config.repeatOrdinals;
        beforeAll( function() {
            config.repeatOrdinals = true;
        } );

        afterAll( function() {
            config.repeatOrdinals = dflt;
        } );
        // this test is only interested in the model, but adding ordinals to default repeat instances is directed
        // by Form.js
        // // Very theoretical. Situation will never occur with OC.
        xit( 'initialize correctly with ordinals if more than one top-level repeat is included in model', function() {
            var f = loadForm( 'nested_repeats.xml' );
            f.init();
            var model = f.model;
            expect( model.getStr().replace( />\s+</g, '><' ) ).toContain(
                '<kids_details enk:last-used-ordinal="2" enk:ordinal="1"><kids_name>Tom</kids_name><kids_age>2</kids_age>' +
                '<immunization_info enk:last-used-ordinal="2" enk:ordinal="1"><vaccine>Polio</vaccine><date/></immunization_info>' +
                '<immunization_info enk:ordinal="2"><vaccine>Rickets</vaccine><date/></immunization_info></kids_details>' +
                '<kids_details enk:ordinal="2"><kids_name>Dick</kids_name><kids_age>5</kids_age>' +
                '<immunization_info enk:last-used-ordinal="3" enk:ordinal="1"><vaccine>Malaria</vaccine><date/></immunization_info>' +
                '<immunization_info enk:ordinal="2"><vaccine>Flu</vaccine><date/></immunization_info>' +
                '<immunization_info enk:ordinal="3"><vaccine>Polio</vaccine><date/></immunization_info>' +
                '</kids_details>' );
        } );
    } );

    describe( 'supports repeat count', function() {
        it( 'to dynamically remove/add repeats', function() {
            var f = loadForm( 'repeat-count.xml' );
            var rep = '.or-repeat[name="/dynamic-repeat-count/rep"]';
            var cnt = '[name="/dynamic-repeat-count/count"]';
            var $form;
            var $model;
            f.init();
            $form = f.view.$;
            $model = f.model.$;
            // check that repeat count is evaluated upon load for default values
            expect( $form.find( rep ).length ).toEqual( 2 );
            expect( $model.find( 'rep' ).length ).toEqual( 2 );
            // increase
            $form.find( cnt ).val( 10 ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 10 );
            expect( $model.find( 'rep' ).length ).toEqual( 10 );
            // decrease
            $form.find( cnt ).val( 5 ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 5 );
            expect( $model.find( 'rep' ).length ).toEqual( 5 );
            // decrease too much
            $form.find( cnt ).val( 0 ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 0 );
            expect( $model.find( 'rep' ).length ).toEqual( 0 );
            // decrease way too much
            $form.find( cnt ).val( -10 ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 0 );
            expect( $model.find( 'rep' ).length ).toEqual( 0 );
            // go back up after reducing to 0
            $form.find( cnt ).val( 5 ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 5 );
            expect( $model.find( 'rep' ).length ).toEqual( 5 );
            // empty value should be considered as 0
            $form.find( cnt ).val( '' ).trigger( 'change' );
            expect( $form.find( rep ).length ).toEqual( 0 );
            expect( $model.find( 'rep' ).length ).toEqual( 0 );
        } );

        it( 'and works nicely with relevant even if repeat count is 0 (with relevant on group)', function() {
            // When repeat count is zero there is no context node to pass to evaluator.
            var f = loadForm( 'repeat-count-relevant.xml' );
            var errors = f.init();
            expect( errors.length ).toEqual( 0 );
            expect( f.view.$.find( '.or-repeat[name="/data/rep"]' ).length ).toEqual( 0 );
            expect( f.view.$.find( '.or-group.or-branch[name="/data/rep"]' ).hasClass( 'disabled' ) ).toBe( true );
        } );

        it( 'and works nicely with relevant even if repeat count is 0 (with output in group label)', function() {
            // When repeat count is zero there is no context node to pass to evaluator.
            var f = loadForm( 'repeat-count-relevant.xml' );
            var errors = f.init();
            expect( errors.length ).toEqual( 0 );
            expect( f.view.$.find( '.or-repeat[name="/data/rep"]' ).length ).toEqual( 0 );
            f.view.$.find( 'input[name="/data/q1"]' ).val( 2 ).trigger( 'change' );
            expect( f.view.$.find( '.or-group.or-branch[name="/data/rep"]>h4 .or-output' ).text() ).toEqual( '2' );
        } );

        it( 'and correctly deals with nested repeats that have a repeat count', function() {
            var f = loadForm( 'repeat-count-nested-2.xml' );
            var schools = '[name="/data/repeat_A/schools"]';
            var a = '.or-repeat[name="/data/repeat_A"]';
            var b = '.or-repeat[name="/data/repeat_A/repeat_B"]';
            f.init();

            f.view.$.find( schools ).eq( 1 ).val( '2' ).trigger( 'change' );

            expect( f.view.$.find( a ).eq( 1 ).find( b ).length ).toEqual( 2 );
        } );
    } );


    describe( 'creates 0 repeats', function() {

        it( ' if a record is loaded with 0 repeats (simple)', function() {
            var repeat = '.or-repeat[name="/repeat-required/rep"]';
            var f = loadForm( 'repeat-required.xml', '<repeat-required><d>b</d><meta><instanceID>a</instanceID></meta></repeat-required>' );
            f.init();
            expect( f.view.$.find( repeat ).length ).toEqual( 0 );
        } );

        it( ' if a record is loaded with 0 nested repeats (simple)', function() {
            var repeat1 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
            var repeat2 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
            var f = loadForm( 'nested-repeats-nasty.xml', '<q><PROGRAMME><PROJECT>' +
                '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name></INFORMATION></Partner>' +
                '</PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>' );
            f.init();
            expect( f.view.$.find( repeat1 ).length ).toEqual( 1 );
            expect( f.view.$.find( repeat2 ).length ).toEqual( 0 );
        } );

        it( ' if a record is loaded with 0 nested repeats (advanced)', function() {
            var repeat1 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
            var repeat2 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
            var f = loadForm( 'nested-repeats-nasty.xml', '<q><PROGRAMME><PROJECT>' +
                '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name></INFORMATION></Partner>' +
                '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name><Camp><P_Camps/></Camp></INFORMATION></Partner>' +
                '</PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>' );
            f.init();
            expect( f.view.$.find( repeat1 ).length ).toEqual( 2 );
            expect( f.view.$.find( repeat1 ).eq( 0 ).find( repeat2 ).length ).toEqual( 0 );
            expect( f.view.$.find( repeat1 ).eq( 1 ).find( repeat2 ).length ).toEqual( 1 );
        } );

        // This is a VERY special case, because the form contains a template as well as multiple repeat instances
        xit( ' if a record is loaded with 0 repeats (very advanced)', function() {
            var repeat = '.or-repeat[name="/repeat-dot/rep.dot"]';
            var f = loadForm( 'repeat-dot.xml', '<repeat-dot><meta><instanceID>a</instanceID></meta></repeat-dot>' );
            f.init();
            expect( f.view.$.find( repeat ).length ).toEqual( 0 );
        } );
    } );

    describe( 'initializes date widgets', function() {
        it( 'in a new repeat instance if the date widget is not relevant by default', function() {
            var form = loadForm( 'repeat-irrelevant-date.xml' );
            form.init();
            form.view.$.find( '.add-repeat-btn' ).click();
            // make date field in second repeat relevant
            form.view.$.find( '[name="/repeat/rep/a"]' ).eq( 1 ).val( 'a' ).trigger( 'change' );
            expect( form.view.$.find( '[name="/repeat/rep/b"]' ).eq( 1 ).closest( '.question' ).find( '.widget' ).length ).toEqual( 1 );
        } );
    } );

} );

describe( 'calculations', function() {

    it( 'also work inside repeats', function() {
        var form = loadForm( 'calcs_in_repeats.xml' );
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click();
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(0)' ).val( '10' ).trigger( 'change' );
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(1)' ).val( '20' ).trigger( 'change' );
        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 0 ).getVal()[ 0 ] ).toEqual( '200' );
        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 1 ).getVal()[ 0 ] ).toEqual( '400' );
    } );

    it( 'are not performed if the calculation is not relevant', function() {
        var form = loadForm( 'calcs_in_repeats.xml' );
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click().click();

        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(0)' ).val( '20' ).trigger( 'change' );
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(1)' ).val( '5' ).trigger( 'change' );
        form.view.$.find( '[name="/calcs_in_repeats/rep1/num1"]:eq(2)' ).val( '40' ).trigger( 'change' );

        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 0 ).getVal()[ 0 ] ).toEqual( '400' );
        expect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 1 ).getVal()[ 0 ] ).toEqual( '' );
        //sexpect( form.model.node( '/calcs_in_repeats/rep1/grp/calc3', 2 ).getVal()[ 0 ] ).toEqual( '800' );
    } );

    it( 'outside a repeat are updated if they are dependent on a repeat node', function() {
        var f = loadForm( 'repeat-count.xml' );
        var cnt = '[name="/dynamic-repeat-count/count"]';
        var $form;
        var $model;
        f.init();
        $form = f.view.$;
        $model = f.model.$;
        // increase count to 10
        $form.find( cnt ).val( 10 ).trigger( 'change' );
        expect( $model.find( 'sum_note' ).text() ).toEqual( '10' );
        expect( $model.find( 'txtsum_note' ).text() ).toEqual( '10' );
    } );

    // https://github.com/enketo/enketo-core/issues/479
    it( 'inside a repeat using the position(..) function are updated if the position changes due to repeat removal', function() {
        var form = loadForm( 'repeat-position.xml' );
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click().click().click();
        form.view.$.find( '.remove' ).eq( 1 ).click();
        expect( form.model.xml.querySelectorAll( 'pos' )[ 1 ].textContent ).toEqual( '2' );
        expect( form.view.$.find( '.or-output[data-value="/RepeatGroupTest/P/pos"]' ).eq( 1 ).text() ).toEqual( '2' );
        expect( form.model.xml.querySelectorAll( 'pos' )[ 2 ].textContent ).toEqual( '3' );
        expect( form.view.$.find( '.or-output[data-value="/RepeatGroupTest/P/pos"]' ).eq( 2 ).text() ).toEqual( '3' );
    } );

} );

describe( 'branching functionality', function() {

    it( 'hides irrelevant branches upon initialization', function() {
        var form = loadForm( 'group_branch.xml' );
        form.init();
        expect( form.view.$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).toBe( true );
        expect( form.view.$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).toEqual( 1 );
    } );

    it( 'reveals a group branch when the relevant condition is met', function() {
        var form = loadForm( 'group_branch.xml' );
        form.init();
        //first check incorrect value that does not meet relevant condition
        form.view.$.find( '[name="/data/nodeA"]' ).val( 'no' ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).toBe( true );
        //then check value that does meet relevant condition
        form.view.$.find( '[name="/data/nodeA"]' ).val( 'yes' ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/group"]' ).hasClass( 'disabled' ) ).toBe( false );
    } );

    it( 'reveals a question when the relevant condition is met', function() {
        var form = loadForm( 'group_branch.xml' );
        form.init();
        //first check incorrect value that does not meet relevant condition
        form.view.$.find( '[name="/data/group/nodeB"]' ).val( 3 ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).toEqual( 1 );
        //then check value that does meet relevant condition
        form.view.$.find( '[name="/data/group/nodeB"]' ).val( 2 ).trigger( 'change' );
        expect( form.view.$.find( '[name="/data/nodeC"]' ).parents( '.disabled' ).length ).toEqual( 0 );
    } );

    /*
    Issue 208 was a combination of two issues:
        1. branch logic wasn't evaluated on repeated radiobuttons (only on the original) in branch.update()
        2. position[i] wasn't properly injected in makeBugCompiant() if the context node was a radio button or checkbox
     */
    it( 'a) evaluates relevant logic on a repeated radio-button-question and b) injects the position correctly (issue 208)', function() {
        var repeatSelector = '.or-repeat[name="/issue208/rep"]';
        var form = loadForm( 'issue208.xml' );
        form.init();

        form.view.$.find( '.add-repeat-btn' ).click();
        expect( form.view.$.find( repeatSelector ).length ).toEqual( 2 );
        //check if initial state of 2nd question in 2nd repeat is disabled
        expect( form.view.$.find( repeatSelector ).eq( 1 )
            .find( '[data-name="/issue208/rep/nodeB"]' ).closest( '.question' )
            .hasClass( 'disabled' ) ).toBe( true );
        //select 'yes' in first question of 2nd repeat
        form.model.node( '/issue208/rep/nodeA', 1 ).setVal( 'yes', null, 'string' );
        //doublecheck if new value was set
        expect( form.model.node( '/issue208/rep/nodeA', 1 ).getVal()[ 0 ] ).toEqual( 'yes' );
        //check if 2nd question in 2nd repeat is now enabled
        expect( form.view.$.find( repeatSelector ).eq( 1 )
            .find( '[data-name="/issue208/rep/nodeB"]' ).closest( '.question' ).hasClass( 'disabled' ) ).toBe( false );

    } );

    it( 're-evaluates when a node with a relative path inside a relevant expression is changed', function() {
        var form = loadForm( 'relative.xml' );
        form.init();
        var $form = form.view.$,
            $a = $form.find( '[name="/relative/a"]' ),
            $branch = $form.find( '[name="/relative/c"]' ).closest( '.or-branch' );

        $a.val( 'abcd' ).trigger( 'change' );
        expect( $branch.length ).toEqual( 1 );
        expect( $branch.hasClass( 'disabled' ) ).toEqual( false );
    } );

    describe( 'when used with calculated items', function() {
        var form = loadForm( 'calcs.xml' );
        form.init();
        var $node = form.view.$.find( '[name="/calcs/cond1"]' );
        var dataO = form.model;

        it( 'evaluates a calculated item only when it becomes relevant', function() {
            // node without relevant attribute:
            expect( dataO.node( '/calcs/calc11' ).getVal()[ 0 ] ).toEqual( '12' );
            // node that is irrelevant
            expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '' );
            $node.val( 'yes' ).trigger( 'change' );
            // node that has become relevant
            expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '3' );
            // make irrelevant again (was a bug)
            $node.val( 'no' ).trigger( 'change' );
            // double-check that calc11 is unaffected (was a bug)
            expect( dataO.node( '/calcs/calc11' ).getVal()[ 0 ] ).toEqual( '12' );
            // node that is irrelevant
            expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '' );

        } );

        it( 'empties an already calculated item once it becomes irrelevant', function() {
            $node.val( 'yes' ).trigger( 'change' );
            expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '3' );
            $node.val( 'no' ).trigger( 'change' );
            expect( dataO.node( '/calcs/calc1' ).getVal()[ 0 ] ).toEqual( '' );
        } );
    } );

    describe( 'inside repeats when multiple repeats are present upon loading', function() {

        it( 'correctly evaluates the relevant logic of each question inside all repeats (issue #507)', function() {
            var form = loadForm( 'multiple_repeats_relevant.xml' );
            form.init();
            var $relNodes = form.view.$.find( '[name="/multiple_repeats_relevant/rep/skipq"]' ).parent( '.or-branch' );
            expect( $relNodes.length ).toEqual( 2 );
            //check if both questions with 'relevant' attributes in the 2 repeats are disabled
            expect( $relNodes.eq( 0 ).hasClass( 'disabled' ) ).toBe( true );
            expect( $relNodes.eq( 1 ).hasClass( 'disabled' ) ).toBe( true );
        } );

        it( 'correctly evaluates the relevant logic of each simple select question inside all repeats (issue #442 core)', function() {
            var form = loadForm( 'repeat-relevant-select1.xml', '<Enketo_tests><details><fruits>pear</fruits><location></location></details><details><fruits>mango</fruits><location>kisumu</location></details><details><fruits>mango</fruits><location>kisumu</location></details><meta><instanceID>a</instanceID></meta></Enketo_tests>' );
            form.init();
            var $relNodes = form.view.$.find( '[data-name="/Enketo_tests/details/location"]' ).closest( '.or-branch' );
            expect( $relNodes.length ).toEqual( 3 );
            //check if radiobuttons with 'relevant' attributes in the second and third repeats are initialized and enabled
            expect( $relNodes.eq( 0 ).hasClass( 'disabled' ) ).toBe( true );
            expect( $relNodes.eq( 1 ).hasClass( 'pre-init' ) ).toBe( false );
            expect( $relNodes.eq( 1 ).hasClass( 'disabled' ) ).toBe( false );
            expect( $relNodes.eq( 2 ).hasClass( 'pre-init' ) ).toBe( false );
            expect( $relNodes.eq( 2 ).hasClass( 'disabled' ) ).toBe( false );
        } );

    } );

    // https://github.com/kobotoolbox/enketo-express/issues/846
    describe( 'inside repeats for a calculation without a form control when no repeats exist', function() {
        var form = loadForm( 'calcs_in_repeats_2.xml' );
        var loadErrors = form.init();
        it( 'does not throw an error', function() {
            expect( loadErrors.length ).toEqual( 0 );
        } );
    } );

    describe( 'in nested branches ', function() {
        var form = loadForm( 'nested-branches.xml' );

        form.init();
        var $nestedBranch = form.view.$.find( '[name="/nested-branches/group/c"]' ).closest( '.question' );

        it( 'works correctly when an ancestor branch gets enabled', function() {
            expect( $nestedBranch.closest( '.disabled' ).length ).toEqual( 1 );
            // enable parent branch
            form.model.node( '/nested-branches/a', 0 ).setVal( '1' );
            expect( $nestedBranch.closest( '.disabled' ).length ).toEqual( 0 );
            // check if nested branch has been initialized and is enabled
            expect( $nestedBranch.hasClass( 'pre-init' ) ).toBe( false );
            expect( $nestedBranch.hasClass( 'disabled' ) ).toBe( false );
        } );
    } );

    // https://github.com/enketo/enketo-core/issues/444
    describe( 'in nested repeats with a <select> that has a relevant', function() {
        // instanceStr is in this case just used to conveniently create 2 parent repeats with each 1 child repeat (<select> with relevant).
        // The second child repeat in each parent repeat with name 'type_other' is irrelevant.
        var instanceStr = '<data><region><livestock><type>d</type><type_other/></livestock></region><region><livestock><type>d</type></livestock></region><meta><instanceID>a</instanceID></meta></data>';
        var form = loadForm( 'nested-repeat-v5.xml', instanceStr );
        form.init();
        it( 'initializes all nested repeat questions', function() {
            expect( form.view.$.find( '.or-branch' ).length ).toEqual( 4 );
            expect( form.view.$.find( '.or-branch.pre-init' ).length ).toEqual( 0 );
        } );
    } );

    describe( 'handles clearing of form control values in irrelevant branches', function() {
        var name = 'relevant-default.xml';
        var one = '/relevant-default/one';
        var two = '/relevant-default/two';
        var three = '/relevant-default/grp/three';
        var four = '/relevant-default/grp/four';

        it( 'by not clearing UPON LOAD', function() {
            var form = loadForm( name );
            form.init();
            expect( form.view.$.find( '[name="' + two + '"]' ).closest( '.disabled' ).length ).toEqual( 1 );
            expect( form.view.$.find( '[name="' + three + '"]' ).closest( '.disabled' ).length ).toEqual( 1 );
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( 'two' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( 'three' );
        } );

        it( 'by not clearing values of irrelevant questions during FORM TRAVERSAL if clearIrrelevantsImmediately is set to false', function() {
            var form = loadForm( name, null, {
                clearIrrelevantImmediately: false
            } );
            form.init();
            var $one = form.view.$.find( '[name="' + one + '"]' );
            // enable
            $one.val( 'text' ).trigger( 'change' );
            expect( form.view.$.find( '[name="' + two + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            expect( form.view.$.find( '[name="' + three + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            // disable
            $one.val( '' ).trigger( 'change' );
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( 'two' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( 'three' );
        } );

        it( 'by clearing values of irrelevant questions during FORM TRAVERSAL if clearIrrelevantImmediately is set to true', function() {
            var form = loadForm( name, null, {
                clearIrrelevantImmediately: true
            } );
            form.init();
            var $one = form.view.$.find( '[name="' + one + '"]' );
            // enable
            $one.val( 'text' ).trigger( 'change' );
            expect( form.view.$.find( '[name="' + two + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            expect( form.view.$.find( '[name="' + three + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            // disable
            $one.val( '' ).trigger( 'change' );
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( '' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( '' );
        } );

        it( 'by clearing values of irrelevant questions during FORM TRAVERSAL if clearIrrelevantImmediately is not set', function() {
            var form = loadForm( name );
            form.init();
            var $one = form.view.$.find( '[name="' + one + '"]' );
            // enable
            $one.val( 'text' ).trigger( 'change' );
            expect( form.view.$.find( '[name="' + two + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            expect( form.view.$.find( '[name="' + three + '"]' ).closest( '.disabled' ).length ).toEqual( 0 );
            // disable
            $one.val( '' ).trigger( 'change' );
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( '' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( '' );
        } );

        it( 'by clearing values of irrelevant questions when form.clearIrrelevant() is called', function() {
            var form = loadForm( name );
            form.init();
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( 'two' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( 'three' );
            form.clearIrrelevant();
            expect( form.model.node( two ).getVal()[ 0 ] ).toEqual( '' );
            expect( form.model.node( three ).getVal()[ 0 ] ).toEqual( '' );
        } );

        it( 'by not conducting calculations upon load if the calc node is not relevant', function() {
            var form = loadForm( name );
            form.init();
            expect( form.model.node( four ).getVal()[ 0 ] ).toEqual( '' );
        } );

    } );


    describe( 'handles calculated values in irrelevant/relevant branches with default settings', function() {
        var name = 'calc-in-group-with-relevant.xml';
        var cond = '/calc-in-group-with-relevant/cond';
        var groupCalc = '/calc-in-group-with-relevant/grp/groupCalc';
        var groupReadonlyCalc = '/calc-in-group-with-relevant/grp/groupReadonlyCalc';
        var readonlyCalc = '/calc-in-group-with-relevant/readonlyCalc';
        var calc = '/calc-in-group-with-relevant/calc';

        it( 'by not clearing when relevant upon load', function() {
            var form = loadForm( name );
            form.init();
            expect( form.model.node( groupCalc ).getVal()[ 0 ] ).toEqual( '34' );
            expect( form.model.node( groupReadonlyCalc ).getVal()[ 0 ] ).toEqual( '34' );
            expect( form.model.node( readonlyCalc ).getVal()[ 0 ] ).toEqual( '34' );
            expect( form.model.node( calc ).getVal()[ 0 ] ).toEqual( '34' );
        } );

        it( 'by clearing calculations when parent group of calculation itself becomes irrelevant', function() {
            var form = loadForm( name );
            form.init();
            form.view.$.find( '[name="' + cond + '"]' ).val( 'hide' ).trigger( 'change' );
            expect( form.model.node( groupCalc ).getVal()[ 0 ] ).toEqual( '' );
            expect( form.model.node( groupReadonlyCalc ).getVal()[ 0 ] ).toEqual( '' );

            // bonus, questions outside group but also irrelevant
            expect( form.model.node( readonlyCalc ).getVal()[ 0 ] ).toEqual( '' );
            expect( form.model.node( calc ).getVal()[ 0 ] ).toEqual( '' );
        } );

        it( 'by re-populating calculations when parent group of calculation itself becomes relevant', function() {
            var form = loadForm( name );
            form.init();
            // make irrelevant -> clear (see previous test)
            form.view.$.find( '[name="' + cond + '"]' ).val( 'hide' ).trigger( 'change' );
            // make relevant again
            form.view.$.find( '[name="' + cond + '"]' ).val( '' ).trigger( 'change' );
            expect( form.model.node( groupCalc ).getVal()[ 0 ] ).toEqual( '34' );
            expect( form.model.node( groupReadonlyCalc ).getVal()[ 0 ] ).toEqual( '34' );
            // bonus, questions outside group but also irrelevant
            expect( form.model.node( readonlyCalc ).getVal()[ 0 ] ).toEqual( '34' );
            expect( form.model.node( calc ).getVal()[ 0 ] ).toEqual( '34' );
        } );

    } );

    describe( 'in a cloned repeat with dependencies outside the repeat', function() {
        it( 'initializes the relevants', function() {
            var form = loadForm( 'repeat-child-relevant.xml' );
            form.init();
            form.view.$.find( '.add-repeat-btn' ).click();
            expect( form.view.$.find( '.or-branch' ).length ).toEqual( 2 );
            expect( form.view.$.find( '.or-branch.pre-init' ).length ).toEqual( 0 );
        } );
    } );

} );

describe( 'obtaining XML string from form without irrelevant nodes', function() {
    it( 'works for calcs that are irrelevant upon load', function() {
        var form = loadForm( 'calcs.xml' );
        var match = '<calc1/>';
        form.init();

        expect( form.getDataStr() ).toMatch( match );
        expect( form.getDataStr( {
            irrelevant: false
        } ) ).not.toMatch( match );
    } );

    it( 'works for calcs that become irrelevant after load', function() {
        var $node;
        var form = loadForm( 'calcs.xml' );
        form.init();
        $node = form.view.$.find( '[name="/calcs/cond1"]' );

        $node.val( 'yes' ).trigger( 'change' );
        expect( form.getDataStr( {
            irrelevant: false
        } ) ).toMatch( '<calc1>3</calc1>' );

        $node.val( 'nope' ).trigger( 'change' );

        var res = form.getDataStr( {
            irrelevant: false
        } );
        expect( res ).not.toMatch( '<calc1/>' );
        expect( res ).not.toMatch( '<calc1>' );
    } );

    it( 'works for a nested branch where there is an relevant descendant of an irrelevant ancestor', function() {
        var form = loadForm( 'nested-branches.xml' );
        var match = '<c/>';
        form.init();

        expect( form.getDataStr( {
            irrelevant: false
        } ) ).not.toMatch( match );

    } );

    // This test also checks that no exception occurs when an attempt is made to remove the <c> node 
    // when it no longer exists because its parent has already been removed.
    it( 'works for a nested branch where there is an irrelevant descendant of an irrelevant ancestor', function() {
        var form = loadForm( 'nested-branches.xml' );
        var match = '<c/>';
        form.init();
        form.view.$.find( '[name="/nested-branches/b"]' ).val( 0 ).trigger( 'change' );

        expect( form.getDataStr( {
            irrelevant: false
        } ) ).not.toMatch( match );

    } );

    it( 'works if repeat count is 0', function() {
        // When repeat count is zero there is no context node to pass to evaluator.
        var form = loadForm( 'repeat-count-relevant.xml' );
        var getFn = function() {
            return form.getDataStr( {
                irrelevant: false
            } );
        };
        form.init();
        expect( getFn ).not.toThrow();
        expect( getFn() ).not.toMatch( '<rep>' );
        expect( getFn() ).toMatch( '<q1/>' );
    } );

    // Issue https://github.com/enketo/enketo-core/issues/443: The incorrect nested repeat nodes are removed.
    it( 'works for nested repeats where some children are irrelevant', function() {
        // instanceStr is in this case just used to conveniently create 2 parent repeats with each 2 child repeats and certain values.
        // The second child repeat in each parent repeat with name 'type_other' is irrelevant.
        var instanceStr = '<data><region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>one</type_other></livestock></region><region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>two</type_other></livestock></region><meta><instanceID>a</instanceID></meta></data>';
        var form = loadForm( 'nested-repeat-v5.xml', instanceStr );
        form.init();

        // check setup
        expect( form.getDataStr( {
            irrelevant: true
        } ).replace( />\s+</g, '><' ) ).toMatch( '<region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>one</type_other></livestock></region><region><livestock><type>d</type><type_other/></livestock><livestock><type>other</type><type_other>two</type_other></livestock></region>' );

        // perform actual tests
        expect( form.getDataStr( {
            irrelevant: false
        } ).replace( />\s+</g, '><' ) ).toMatch( '<region><livestock><type>d</type></livestock><livestock><type>other</type><type_other>one</type_other></livestock></region><region><livestock><type>d</type></livestock><livestock><type>other</type><type_other>two</type_other></livestock></region>' );
    } );

    // https://github.com/kobotoolbox/enketo-express/issues/824
    it( 'works for simple "select" (checkbox) questions inside repeats', function() {
        var form = loadForm( 'repeat-relevant-select.xml' );
        var repeat = '.or-repeat[name="/data/details"]';
        var fruit = '[name="/data/details/fruits"]';
        var location = '[name="/data/details/location"]';
        form.init();
        form.view.$.find( '.add-repeat-btn' ).click().click();
        form.view.$.find( repeat ).eq( 0 ).find( fruit + '[value="pear"]' ).prop( 'checked', true ).trigger( 'change' );
        form.view.$.find( repeat ).eq( 1 ).find( fruit + '[value="mango"]' ).prop( 'checked', true ).trigger( 'change' );
        form.view.$.find( repeat ).eq( 2 ).find( fruit + '[value="pear"]' ).prop( 'checked', true ).trigger( 'change' );
        form.view.$.find( repeat ).eq( 1 ).find( location + '[value="nairobi"]' ).prop( 'checked', true ).trigger( 'change' );

        expect( form.getDataStr( {
            irrelevant: false
        } ).replace( />\s+</g, '><' ) ).toMatch( '<details><fruits>pear</fruits></details><details><fruits>mango</fruits><location>nairobi</location></details><details><fruits>pear</fruits></details>' );
    } );

} );

describe( 'validation', function() {

    describe( 'feedback to user after equired field validation', function() {
        var form, $numberInput, $numberLabel;

        beforeEach( function() {
            $.fx.off = true; //turn jQuery animations off
            form = loadForm( 'group_branch.xml' );
            form.init();
            $numberInput = form.view.$.find( '[name="/data/group/nodeB"]' );
            $numberLabel = form.input.getWrapNodes( $numberInput );
        } );

        it( 'validates a DISABLED and required number field without a value', function() {
            $numberInput.val( '' ).trigger( 'change' );
            expect( $numberLabel.length ).toEqual( 1 );
            expect( $numberInput.val().length ).toEqual( 0 );
            expect( $numberLabel.parents( '.or-group' ).prop( 'disabled' ) ).toBe( true );
            expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( false );
        } );

        //see issue #144
        it( 'validates an enabled and required number field with value 0 and 1', function() {
            form.view.$.find( '[name="/data/nodeA"]' ).val( 'yes' ).trigger( 'change' );
            expect( $numberLabel.length ).toEqual( 1 );
            $numberInput.val( 0 ).trigger( 'change' ).trigger( 'validate' );
            expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( false );
            $numberInput.val( 1 ).trigger( 'change' ).trigger( 'validate' );
            expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( false );
        } );

        // failing
        it( 'invalidates an enabled and required number field without a value', function( done ) {
            // first make branch relevant
            form.view.$.find( '[name="/data/nodeA"]' ).val( 'yes' ).trigger( 'change' );
            // now set value to empty
            $numberInput.val( '' ).trigger( 'change' );
            form.validateInput( $numberInput )
                .then( function() {
                    expect( $numberLabel.hasClass( 'invalid-required' ) ).toBe( true );
                    done();
                } );
        } );

        it( 'invalidates an enabled and required textarea that contains only a newline character or other whitespace characters', function( done ) {
            form = loadForm( 'thedata.xml' );
            form.init();
            var $textarea = form.view.$.find( '[name="/thedata/nodeF"]' );
            $textarea.val( '\n' ).trigger( 'change' );
            form.validateInput( $textarea )
                .then( function() {
                    expect( $textarea.length ).toEqual( 1 );
                    expect( $textarea.parent( 'label' ).hasClass( 'invalid-required' ) ).toBe( true );
                    $textarea.val( '  \n  \n\r \t ' ).trigger( 'change' );
                    return form.validateInput( $textarea );
                } )
                .then( function() {
                    expect( $textarea.parent( 'label' ).hasClass( 'invalid-required' ) ).toBe( true );
                    done();
                } );
        } );

        it( 'hides a required "*" if the expression is dynamic and evaluates to false', function( done ) {
            form = loadForm( 'dynamic-required.xml' );
            form.init();
            var $dynReq = form.view.$.find( '.required' );

            expect( $dynReq.eq( 0 ).hasClass( 'hide' ) ).toBe( false );
            form.validateInput( form.view.$.find( '[name="/dynamic-required/num"]' ) ).then( function() {
                expect( $dynReq.eq( 1 ).hasClass( 'hide' ) ).toBe( true );
                done();
            } );
        } );
    } );

    describe( 'public validate method', function() {

        it( 'returns false if constraint is false', function( done ) {
            var form = loadForm( 'thedata.xml' );
            form.init();

            // first make the form valid to make sure we are testing the right thing
            form.model.xml.querySelector( 'nodeF' ).textContent = 'f';

            form.validate()
                .then( function( result ) {
                    // check test setup
                    expect( result ).toEqual( true );
                    // now make make sure a constraint fails
                    form.model.xml.querySelector( 'nodeB' ).textContent = 'c';
                    return form.validate();
                } )
                .then( function( result ) {
                    expect( result ).toEqual( false );
                    done();
                } );
        } );

    } );

    // These tests were a real pain to write because of the need to change a global config property.
    describe( 'with validateContinuously', function() {
        var form;
        var B = '[name="/data/b"]';
        var C = '[name="/data/c"]';
        var config = require( 'enketo-config' );
        var dflt = config.validateContinuously;

        var setValue = function( selector, val ) {
            return new Promise( function( resolve ) {
                // violate constraint for c
                form.view.$.find( selector ).val( val ).trigger( 'change' );
                setTimeout( function() {
                    resolve();
                }, 800 );
            } );
        };

        afterAll( function() {
            // reset to default
            config.validateContinuously = dflt;
        } );


        it( '=true will immediately re-evaluate a constraint if its dependent value changes', function( done ) {
            form = loadForm( 'constraint-dependency.xml' );
            form.init();
            setValue( C, '12' )
                .then( function() {
                    config.validateContinuously = false;
                    // violate
                    return setValue( B, 'a' );
                } )
                .then( function() {
                    expect( form.view.$.find( C ).closest( '.question' ).hasClass( 'invalid-constraint' ) ).toEqual( false );
                    // pass
                    return setValue( B, 'b' );
                } )
                .then( function() {
                    config.validateContinuously = true;
                    //violate
                    return setValue( B, 'a' );
                } )
                .then( function() {
                    expect( form.view.$.find( C ).closest( '.question' ).hasClass( 'invalid-constraint' ) ).toEqual( true );
                    done();
                } );
        } );

        it( '=true, will not immediate validate a brand new repeat but will validate nodes that depend on that repeat', function( done ) {
            var rep = '[name="/repeat-required/rep"]';
            var d = '[name="/repeat-required/d"]';
            form = loadForm( 'repeat-required.xml' );
            form.init();
            form.view.$.find( '.add-repeat-btn' ).click();

            // an ugly test, I don't care
            setTimeout( function() {
                // new repeat should not show errors
                expect( form.view.$.find( rep ).eq( 1 ).find( '.invalid-required, .invalid-constraint' ).length ).toEqual( 0 );
                // we now have two repeats so node d should not be marked as invalid
                expect( form.view.$.find( d ).closest( '.question' ).is( '.invalid-constraint' ) ).toBe( false );

                form.view.$.find( '.add-repeat-btn' ).click();

                setTimeout( function() {
                    // new repeat should not show errors
                    expect( form.view.$.find( rep ).eq( 2 ).find( '.invalid-required, .invalid-constraint' ).length ).toEqual( 0 );
                    // we now have three repeats so node d should be marked as invalid
                    expect( form.view.$.find( d ).closest( '.question' ).is( '.invalid-constraint' ) ).toBe( true );

                    done();
                }, 800 );
            }, 800 );
        } );
    } );

} );

describe( 'Readonly items', function() {
    it( 'show their calculated value', function() {
        var form = loadForm( 'readonly.xml' );
        form.init();
        expect( form.view.$.find( '[name="/readonly/a"]' ).val() ).toEqual( 'martijn' );
    } );
} );

describe( 'Itemset functionality', function() {
    var form;

    describe( 'in a cascading multi-select after an itemset update', function() {
        var $items1;
        var $items2;
        var items1 = ':not(.itemset-template) > input:checkbox[name="/select-from-selected/crops"]';
        var items2 = ':not(.itemset-template) > input:checkbox[name="/select-from-selected/crop"]';

        beforeEach( function() {
            form = loadForm( 'select-from-selected.xml' );
            form.init();
            $items1 = function() {
                return form.view.$.find( items1 );
            };
            $items2 = function() {
                return form.view.$.find( items2 );
            };
        } );

        it( 'retains (checks) any current values that are still valid values', function() {
            $items1().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( $items2().length ).toEqual( 2 );
            expect( $items2().siblings().text() ).toEqual( 'BananaCacao' );
            // check model
            expect( form.model.$.find( 'crops' ).text() ).toEqual( 'banana cacao' );
            expect( form.model.$.find( 'crop' ).text() ).toEqual( '' );
            // select both items in itemset 2
            $items2().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            // check model
            expect( form.model.$.find( 'crops' ).text() ).toEqual( 'banana cacao' );
            expect( form.model.$.find( 'crop' ).text() ).toEqual( 'banana cacao' );
            // select an additional item in itemset 1
            $items1().filter( '[value="maize"]' ).prop( 'checked', true ).trigger( 'change' );
            // check that the new item was added to itemset 2
            expect( $items2().length ).toEqual( 3 );
            expect( $items2().siblings().text() ).toEqual( 'BananaCacaoMaize' );
            // check that the first two items of itemset 2 are still selected
            expect( $items2().filter( '[value="banana"]' ).prop( 'checked' ) ).toEqual( true );
            expect( $items2().filter( '[value="cacao"]' ).prop( 'checked' ) ).toEqual( true );
            // check that the new item is unselected
            expect( $items2().filter( '[value="maize"]' ).prop( 'checked' ) ).toEqual( false );
            // check model
            expect( form.model.$.find( 'crops' ).text() ).toEqual( 'banana cacao maize' );
            expect( form.model.$.find( 'crop' ).text() ).toEqual( 'banana cacao' );
        } );

        it( 'removes (unchecks) any current values that are no longer valid values', function() {
            $items1().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            // select both items in itemset 2
            $items2().filter( '[value="banana"], [value="cacao"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( form.model.$.find( 'crop' ).text() ).toEqual( 'banana cacao' );
            // add a third non-existing item to model for itemset 2
            form.model.$.find( 'crop' ).text( 'banana fake cacao' );
            expect( form.model.$.find( 'crop' ).text() ).toEqual( 'banana fake cacao' );
            // select an additional item in itemset 1, to trigger update of itemset 2
            $items1().filter( '[value="maize"]' ).prop( 'checked', true ).trigger( 'change' );
            // check that the new item was added to itemset 2
            expect( $items2().siblings().text() ).toEqual( 'BananaCacaoMaize' );
            // check that the first two items of itemset 2 are still selected
            expect( $items2().filter( '[value="banana"]' ).prop( 'checked' ) ).toEqual( true );
            expect( $items2().filter( '[value="cacao"]' ).prop( 'checked' ) ).toEqual( true );
            // check model to see that the fake value was removed
            expect( form.model.$.find( 'crop' ).text() ).toEqual( 'banana cacao' );
        } );
    } );

    describe( 'in a cascading select using itext for all labels', function() {
        var $items1Radio, $items2Radio, $items3Radio, $items1Select, $items2Select, $items3Select,
            sel1Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/country"]',
            sel2Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/city"]',
            sel3Radio = ':not(.itemset-template) > input:radio[data-name="/new_cascading_selections/group1/neighborhood"]',
            sel1Select = 'select[name="/new_cascading_selections/group2/country2"]',
            sel2Select = 'select[name="/new_cascading_selections/group2/city2"]',
            sel3Select = 'select[name="/new_cascading_selections/group2/neighborhood2"]';

        beforeEach( function() {
            form = loadForm( 'new_cascading_selections.xml' );
            form.init();

            spyOn( form.itemset, 'update' ).and.callThrough();

            $items1Radio = function() {
                return form.view.$.find( sel1Radio );
            };
            $items2Radio = function() {
                return form.view.$.find( sel2Radio );
            };
            $items3Radio = function() {
                return form.view.$.find( sel3Radio );
            };
            $items1Select = function() {
                return form.view.$.find( sel1Select + ' > option:not(.itemset-template)' );
            };
            $items2Select = function() {
                return form.view.$.find( sel2Select + ' > option:not(.itemset-template)' );
            };
            $items3Select = function() {
                return form.view.$.find( sel3Select + ' > option:not(.itemset-template)' );
            };
        } );

        it( 'level 1: with <input type="radio"> elements has the expected amount of options', function() {
            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items1Radio().siblings().text() ).toEqual( 'NederlandThe NetherlandsVerenigde StatenUnited States' );
            expect( $items2Radio().length ).toEqual( 0 );
            expect( $items3Radio().length ).toEqual( 0 );
        } );

        it( 'level 2: with <input type="radio"> elements has the expected amount of options', function() {
            //select first option in cascade
            form.view.$.find( sel1Radio + '[value="nl"]' ).prop( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'country';
            } ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items2Radio().siblings().text() ).toEqual( 'AmsterdamAmsterdamRotterdamRotterdamDrontenDronten' );
            expect( $items3Radio().length ).toEqual( 0 );
        } );

        it( 'level 3: with <input type="radio"> elements has the expected amount of options', function() {
            //select first option
            form.view.$.find( sel1Radio + '[value="nl"]' ).attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'country';
            } ) ).toEqual( true );

            //select second option
            form.view.$.find( sel2Radio + '[value="ams"]' ).attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'city';
            } ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items3Radio().length ).toEqual( 2 );
            expect( $items3Radio().siblings().text() ).toEqual( 'WesterparkWesterparkDe DamDam' );

            //select other first option to change itemset
            form.view.$.find( sel1Radio + '[value="nl"]' ).attr( 'checked', false );
            form.view.$.find( sel1Radio + '[value="usa"]' ).attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'city';
            } ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items2Radio().siblings().text() ).toEqual( 'DenverDenverNieuw AmsterdamNew York CityDe EngelenLos Angeles' );
            expect( $items3Radio().length ).toEqual( 0 );
        } );

        it( 'level 1: with <select> <option> elements has the expected amount of options', function() {
            expect( $items1Select().length ).toEqual( 2 );
            expect( $items1Select().eq( 0 ).attr( 'value' ) ).toEqual( 'nl' );
            expect( $items1Select().eq( 1 ).attr( 'value' ) ).toEqual( 'usa' );
            expect( $items2Select().length ).toEqual( 0 );
        } );

        it( 'level 2: with <select> <option> elements has the expected amount of options', function() {
            //select first option in cascade
            form.view.$.find( sel1Select ).val( 'nl' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'country2';
            } ) ).toEqual( true );

            expect( $items1Select().length ).toEqual( 2 );
            expect( $items2Select().length ).toEqual( 3 );
            expect( $items2Select().eq( 0 ).attr( 'value' ) ).toEqual( 'ams' );
            expect( $items2Select().eq( 2 ).attr( 'value' ) ).toEqual( 'dro' );
            expect( $items3Select().length ).toEqual( 0 );
        } );

        it( 'level 3: with <select> <option> elements has the expected amount of options', function() {
            //select first option in cascade
            form.view.$.find( sel1Select ).val( 'nl' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'country2';
            } ) ).toEqual( true );

            //select second option
            form.view.$.find( sel2Select ).val( 'ams' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'city2';
            } ) ).toEqual( true );

            expect( $items1Select().length ).toEqual( 2 );
            expect( $items2Select().length ).toEqual( 3 );
            expect( $items3Select().length ).toEqual( 2 );
            expect( $items3Select().eq( 0 ).attr( 'value' ) ).toEqual( 'wes' );
            expect( $items3Select().eq( 1 ).attr( 'value' ) ).toEqual( 'dam' );

            //select other first option to change itemset
            form.view.$.find( sel1Select ).val( 'usa' ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'city2';
            } ) ).toEqual( true );

            expect( $items1Select().length ).toEqual( 2 );
            expect( $items2Select().length ).toEqual( 3 );
            expect( $items2Select().eq( 0 ).attr( 'value' ) ).toEqual( 'den' );
            expect( $items2Select().eq( 2 ).attr( 'value' ) ).toEqual( 'la' );
            expect( $items3Select().length ).toEqual( 0 );
        } );
    } );

    describe( 'in a cascading select that includes labels without itext', function() {
        var $items1Radio, $items2Radio, $items3Radio,
            sel1Radio = ':not(.itemset-template) > input:radio[data-name="/form/state"]',
            sel2Radio = ':not(.itemset-template) > input:radio[data-name="/form/county"]',
            sel3Radio = ':not(.itemset-template) > input:radio[data-name="/form/city"]';

        beforeEach( function() {
            $.fx.off = true; //turn jQuery animations off
            form = loadForm( 'cascading_mixture_itext_noitext.xml' );
            form.init();

            spyOn( form.itemset, 'update' ).and.callThrough();

            $items1Radio = function() {
                return form.view.$.find( sel1Radio );
            };
            $items2Radio = function() {
                return form.view.$.find( sel2Radio );
            };
            $items3Radio = function() {
                return form.view.$.find( sel3Radio );
            };
        } );

        it( 'level 3: with <input type="radio"> elements using direct references to instance labels without itext has the expected amount of options', function() {
            //select first option
            form.view.$.find( sel1Radio + '[value="washington"]' )
                .attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'state';
            } ) ).toEqual( true );

            //select second option
            form.view.$.find( sel2Radio + '[value="king"]' )
                .attr( 'checked', true ).trigger( 'change' );

            expect( form.itemset.update.calls.mostRecent().args[ 0 ].nodes.some( function( node ) {
                return node === 'county';
            } ) ).toEqual( true );

            expect( $items1Radio().length ).toEqual( 2 );
            expect( $items2Radio().length ).toEqual( 3 );
            expect( $items3Radio().length ).toEqual( 2 );
            expect( $items3Radio().siblings().text() ).toEqual( 'SeattleRedmond' );
        } );
    } );

    describe( 'in a cloned repeat with dependencies inside repeat, ', function() {
        var countrySelector = '[data-name="/new_cascading_selections_inside_repeats/group1/country"]';
        var citySelector = 'label:not(.itemset-template) [data-name="/new_cascading_selections_inside_repeats/group1/city"]';
        var form;
        var $masterRepeat;
        var $clonedRepeat;

        beforeEach( function() {
            form = loadForm( 'new_cascading_selections_inside_repeats.xml' );
            form.init();
            $masterRepeat = form.view.$.find( '.or-repeat' );
            //select usa in master repeat
            $masterRepeat.find( countrySelector + '[value="usa"]' ).prop( 'checked', true ).trigger( 'change' );
            //add repeat
            form.view.$.find( '.add-repeat-btn' ).click();
            $clonedRepeat = form.view.$.find( '.or-repeat.clone' );
        } );

        it( 'the itemset of the cloned repeat is correct (and not a cloned copy of the master repeat)', function() {
            expect( $masterRepeat.find( citySelector ).length ).toEqual( 3 );
            expect( $clonedRepeat.find( countrySelector + ':selected' ).val() ).toBeUndefined();
            expect( $clonedRepeat.find( citySelector ).length ).toEqual( 0 );
        } );

        it( 'the itemset of the master repeat is not affected if the cloned repeat is changed', function() {
            $clonedRepeat.find( countrySelector + '[value="nl"]' ).prop( 'checked', true ).trigger( 'change' );
            expect( $masterRepeat.find( citySelector ).length ).toEqual( 3 );
            expect( $masterRepeat.find( citySelector ).eq( 0 ).attr( 'value' ) ).toEqual( 'den' );
            expect( $clonedRepeat.find( citySelector ).length ).toEqual( 3 );
            expect( $clonedRepeat.find( citySelector ).eq( 0 ).attr( 'value' ) ).toEqual( 'ams' );
        } );
    } );

    describe( 'in a cloned repeat with dependencies outside the repeat', function() {
        it( 'initializes the itemset', function() {
            var form = loadForm( 'nested-repeats-itemset.xml' );
            var selector = '[name="/bug747/name_of_region/name_of_zone/zone"]';
            form.init();
            form.view.$.find( '[data-name="/bug747/name_of_region/region"][value="tigray"]' ).prop( 'checked', true ).trigger( 'change' );
            form.view.$.find( '.or-repeat-info[data-name="/bug747/name_of_region/name_of_zone"] .add-repeat-btn' ).click();
            expect( form.view.$.find( selector ).eq( 0 ).find( 'option:not(.itemset-template)' ).text() ).toEqual( 'CentralSouthern' );
            expect( form.view.$.find( selector ).eq( 1 ).find( 'option:not(.itemset-template)' ).text() ).toEqual( 'CentralSouthern' );
        } );
    } );
} );

describe( 're-validating inputs and updating user feedback', function() {
    var form = loadForm( 'comment.xml' );
    var $one;
    var $oneComment;
    form.init();
    $one = form.view.$.find( '[name="/comment/one"]' );
    $oneComment = form.view.$.find( '[name="/comment/one_comment"]' );
    it( 'works', function( done ) {
        // set question "one" in invalid state (automatic)
        $one.val( '3' ).trigger( 'change' ).val( '' ).trigger( 'change' );
        // validation is asynchronous
        setTimeout( function() {
            expect( $one.closest( '.question' ).hasClass( 'invalid-required' ) ).toBe( true );
            // test relates to https://github.com/kobotoolbox/enketo-express/issues/608
            // input.validate is called by a comment widget on the linked question when the comment value changes
            // set question in valid state (not automatic, but by calling input.validate)
            $oneComment.val( 'comment' ).trigger( 'change' );
            form.input.validate( $one ).then( function() {
                expect( $one.closest( '.question' ).hasClass( 'invalid-required' ) ).toBe( false );
                done();
            } );
        }, 100 );
    } );
} );

describe( 'getting related nodes', function() {

    it( 'excludes radiobuttons that are part of the same group', function() {
        var form = loadForm( 'radio.xml' );
        form.init();
        expect( form.getRelatedNodes( 'data-relevant' ).length ).toEqual( 1 );
    } );
} );

describe( 'clearing inputs', function() {
    var $fieldset = $( '<fieldset><input type="number" value="23" /><input type="text" value="abc" /><textarea>abcdef</textarea></fieldset>"' );

    it( 'works!', function() {
        expect( $fieldset.find( '[type="number"]' ).val() ).toEqual( '23' );
        expect( $fieldset.find( '[type="text"]' ).val() ).toEqual( 'abc' );
        expect( $fieldset.find( 'textarea' ).val() ).toEqual( 'abcdef' );

        $fieldset.clearInputs();

        expect( $fieldset.find( '[type="number"]' ).val() ).toEqual( '' );
        expect( $fieldset.find( '[type="text"]' ).val() ).toEqual( '' );
        expect( $fieldset.find( 'textarea' ).val() ).toEqual( '' );

    } );
} );

describe( 'form status', function() {
    var form = loadForm( 'thedata.xml' );
    form.init();

    it( 'correctly maintains edit status', function() {
        expect( form.editStatus ).toBe( false );
        form.view.$.find( 'input[name="/thedata/nodeA"]' ).val( '2010-10-01T11:12:00+06:00' ).trigger( 'change' );
        expect( form.editStatus ).toBe( true );
    } );
} );

describe( 'required enketo-transformer version', function() {
    var pkg = require( '../../package' );

    it( 'can be obtained', function() {
        var expected = pkg.devDependencies[ 'enketo-transformer' ];
        var actual = Form.getRequiredTransformerVersion();

        expect( actual ).toBe( expected,
            'It looks like enketo-transformer has been updated in package.json from ' + actual + ' to ' + expected + '.  ' +
            'You also need to update the value returned by From.getRequiredTransformerVersion() to the new version number.' );
    } );
} );

describe( 'jr:choice-name', function() {

    it( 'should match when there are spaces in arg strings', function() {
        // given
        var form = loadForm( 'jr-choice-name.xml' );
        form.init();

        expect( form.view.$.find( '[name="/choice-regex/translator"]:checked' ).next().text() ).toEqual( '[Default Value] Area' );
        expect( form.view.$.find( '.note .or-output' ).text() ).toEqual( '[Default Value] Area' );

        // when
        form.view.$.find( '[name="/choice-regex/input"]' ).val( 'abc' ).trigger( 'change' );

        // then
        expect( form.view.$.find( '[name="/choice-regex/translator"]:checked' ).next().text() ).toEqual( '[abc] Area' );

        // and
        // We don't expect the value change to cascade to a label until the choice value itself is changed.
        // See: https://github.com/enketo/enketo-core/issues/412
        expect( form.view.$.find( '.note .or-output' ).text() ).toEqual( '[Default Value] Area' );

        // when
        form.view.$.find( '[name="/choice-regex/translator"][value=health_center]' ).click().trigger( 'change' );

        // then
        expect( form.view.$.find( '.note .or-output' ).text() ).toEqual( '[abc] Health Center' );
    } );

    /** @see https://github.com/enketo/enketo-core/issues/490 */
    it( 'should handle regression reported in issue #490', function() {
        // given
        var form = loadForm( 'jr-choice-name.issue-490.xml' );
        form.init();

        // then
        expect( form.view.$.find( '.note .or-output' ).text() ).toEqual( 'unspecified' );

        // when
        form.view.$.find( '[name="/embedded-choice/translator"][value=clinic]' ).click().trigger( 'change' );

        // then
        expect( form.view.$.find( '.note .or-output' ).text() ).toEqual( 'Area' );
    } );
} );

describe( 'Form.prototype', function() {

    describe( '#replaceChoiceNameFn()', function() {

        $.each( {
            'jr:choice-name( /choice-regex/translator, " /choice-regex/translator ")': '"__MOCK_VIEW_VALUE__"',
            '     jr:choice-name(       /choice-regex/translator     ,  " /choice-regex/translator "   )    ': '     "__MOCK_VIEW_VALUE__"    ',
            "if(string-length( /embedded-choice/translator ) !=0, jr:choice-name( /embedded-choice/translator ,' /embedded-choice/translator '),'unspecified')": "if(string-length( /embedded-choice/translator ) !=0, \"__MOCK_VIEW_VALUE__\",'unspecified')",
        }, function( initial, expected ) {
            it( 'should replace ' + initial + ' with ' + expected, function() {
                // given
                var form = mockChoiceNameForm();

                // when
                var actual = Form.prototype.replaceChoiceNameFn.call( form, initial );

                // then
                expect( actual ).toEqual( expected );
            } );
        } );
    } );
} );

function mockChoiceNameForm() {
    return {
        model: {
            evaluate: function() {
                return '__MOCK_MODEL_VALUE__';
            },
        },
        view: {
            '$': {
                find: function() {
                    return {
                        length: 1,
                        prop: function() {
                            return 'select';
                        },
                        find: function() {
                            return {
                                text: function() {
                                    return '__MOCK_VIEW_VALUE__';
                                },
                            };
                        },
                    };
                },
            },
        },
    };
}
