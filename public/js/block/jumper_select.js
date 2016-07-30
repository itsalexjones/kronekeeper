/* 
This file is part of Kronekeeper, a web based application for 
recording and managing wiring frame records.

Copyright (C) 2016 NP Broadcast Limited

Kronekeeper is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Kronekeeper is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with Kronekeeper.  If not, see <http://www.gnu.org/licenses/>.

*/


define([
	'backbone',
        'jquery',
	'jqueryui'
], function (
) {
        'use strict';

	/* TODO: On dialog close, should we cancel any pending xhr requests? */

	/* Default action to take when dialog is cancelled or jumper is successfully installed */
	var cancel_action;
	var success_action;

	/* Initialise dialog */
	var cancel_button = {
		text: "Cancel",
		icon: "ui-icon-close",
		click: function(e) {
			$(this).dialog("close");
		}
	};

	$("#jumper_connection_dialog").dialog({
		autoOpen: false,
		modal: true,
		buttons: [cancel_button],
		close: function(event) {
			cancel_action()
		}
	});



	function display(args) {

		console.log("display()");
		cancel_action = args.cancel_action;
		success_action = args.success_action;

		/* Reset buttons to initial state */
		$("#jumper_connection_dialog").dialog("option",	"buttons", [cancel_button]);

		/* Reset dialog to show 'loading' message before loading new content */
		$("#jumper_connection_dialog").html($("#loading_message_template").html());
		$("#jumper_connection_dialog").dialog("open");

		/* Are we replacing an existing jumper? */
		var replacing_jumper_id = args.jumper_id;

		var request_data = {
			a_circuit_id: args.circuit_id,
			b_designation: args.destination_designation,
			replacing_jumper_id: replacing_jumper_id
		};

		console.log("displaying jumper connection choices for:", request_data);

		$("#jumper_connection_dialog").load(
			'/jumper/connection_choice',
			request_data,
			function(response, status, xhr) {
				if(status=="success") {
					console.log("loaded connection choices OK");
					handle_connection_choice_load_success();
				}
				else {
					var error_code = xhr.status + " " + xhr.statusText;
					display_load_error(error_code);
				}
			}
		);
	};



	function display_load_error(error_code) {

		/* Displays a loading failed message in the dialog */
		var template = _.template( $('#loading_error_template').html() );
		$("#jumper_connection_dialog").html(
			template({
				error_code: error_code
			})
		);
	}



	function handle_connection_choice_load_success() {

		console.log("handle_connection_choice_load_success");

		/* Set buttons - as a side-effect this re-centres the dialog */
		$("#jumper_connection_dialog").dialog("option",	"buttons", [cancel_button]);

		/* Set up events on dynamically loaded content */
		$("#simple_jumper_button").on("click", handle_simple_jumper_click);
		$("#custom_jumper_button").on("click", handle_custom_jumper_click);
		$(".choose_jumper_connections select").on("change", jumper_connection_change);
	}


	function handle_simple_jumper_click(event) {

		/* Load jumper selection */
		console.log("simple jumper selected");

		/* Reset buttons and show 'loading' message */
		$("#jumper_connection_dialog").html($("#loading_message_template").html());
		$("#jumper_connection_dialog").dialog("option",	"buttons", [cancel_button]);

		var request_data = {
			wire_count: window.jumper_state.a_pins.length,
			a_designation: window.jumper_state.a_circuit.full_designation,
			b_designation: window.jumper_state.b_circuit.full_designation,
		};

		console.log("displaying jumper wire choices for:", request_data);

		$("#jumper_connection_dialog").load(
			'/jumper/wire_choice',
			request_data,
			function(response, status, xhr) {
				if(status=="success") {
					console.log("loaded wire choices OK");
					handle_wire_choice_load_success();
				}
				else {
					var error_code = xhr.status + " " + xhr.statusText;
					display_load_error(error_code);
				}
			}
		);
	}


	function handle_wire_choice_load_success() {

		/* Set buttons - as a side-effect this re-centres the dialog */
		$("#jumper_connection_dialog").dialog("option",	"buttons", [cancel_button]);

		/* Set up events on dynamically loaded content */
		$(".choose_jumper_template .option_group div.option_item").on("click", handle_jumper_template_click);
	}


	function handle_custom_jumper_click(event) {

		console.log("custom jumper selected");

		$("#choose_jumper_type_div").hide();
		$("#choose_jumper_connections_div").show();

		/* Add a next button, but leave it disabled until at least one connection is made */
		/* This has a side-effect of re-centering the dialog on the page */
		var next_button = {
			text: "Next",
			icon: "ui-icon-check",
			click: function(e) {
				console.log("next");
			}
		};
		$("#jumper_connection_dialog").dialog("option",	"buttons", [cancel_button, next_button]);
		$("#jumper_connection_dialog").parent().find('button:contains("Next")').button("disable");
	}


	function hide_next_button_when_no_connections () {

		var not_connected = true;
		$(".choose_jumper_connections select").each(function() {
			if($(this).val()) {
				not_connected = false;
			}
		});

		if(not_connected) {
			$("#jumper_connection_dialog").parent().find('button:contains("Next")').button("disable");
		}
		else {
			$("#jumper_connection_dialog").parent().find('button:contains("Next")').button("enable");
		}
	}


	function jumper_connection_change(e) {
		hide_next_button_when_no_connections();
	}


	function handle_jumper_template_click(event) {
		console.log("jumper_template_click");
		$("#jumper_connection_dialog").html($("#creating_jumper_message_template").html());
		$("#jumper_connection_dialog").dialog("option",	"buttons", [cancel_button]);

		var data = {
			a_circuit_id: window.jumper_state.a_circuit.id, 
			b_circuit_id: window.jumper_state.b_circuit.id,
			jumper_template_id: event.target.getAttribute("data-jumper_template_id"),
			replacing_jumper_id: window.jumper_state.replacing_jumper_id
		};

		console.log(data);

		/* Send request to server */
		$.ajax({
			url: "/api/jumper/add_simple_jumper",
			data: data,
			type: "POST",
			dataType: "json",
			success: function(json) {
				console.log("updated jumper OK");
				$("#jumper_connection_dialog").dialog("close");
				success_action(json);
			},
			error: function(xhr, status) {
				var error_code = xhr.status + " " + xhr.statusText;
				display_load_error(error_code);
			}
		});
	}


	console.log("jumper_select module loaded");

	/* Added while testing so that dialog appears immediately */
/*	display({
		circuit_id: 51,
		destination_designation: 'a08.4'
	});
*/

	/* Export public methods */
	return {
		display: display
	};
});

