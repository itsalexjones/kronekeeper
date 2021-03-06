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
	'jquery',
	'jqueryui'

], function (
) {
        'use strict';

	var MAX_WIRETYPE_FILE_SIZE = 4096;


	/* Initialise dialog */
	var cancel_button = {
		text: "Cancel",
		icon: "ui-icon-close",
		click: function(e) {
			$(this).dialog("close");
		}
	};
	var upload_button = {
		text: "Upload",
		icon: "ui-icon-check",
		click: function(e) {
			submit_form();
		}
	};
	$("#confirm_wiretype_upload_dialog").dialog({
		autoOpen: false,
		modal: true,
		buttons: [cancel_button, upload_button],
		close: function() {
			reset_wiretype_upload_form();
		}
	});


	
	/* Handle file selection */
	$("#wiretype_file").on("change", function(e) {

		/* Not all browsers support File API yet. This convoluted conditional
		 * validates file size only where that API is available. We do size
		 * validation on the server in any case.
		 */
		var fileinput = document.getElementById("wiretype_file");
		if(
			fileinput &&
			fileinput.files &&
			fileinput.files[0] &&
			fileinput.files[0].size > MAX_WIRETYPE_FILE_SIZE
		) {
			console.log("file size: " +  fileinput.files[0].size);
			$("#wiretype_too_big_message").show();
			return;
		}

		$("#confirm_wiretype_upload_dialog").dialog("open");
	});


	function reset_wiretype_upload_form() {
		document.getElementById("wiretype_upload_form").reset();
	}

	function submit_form() {
		document.getElementById("wiretype_upload_form").submit();
	}


	/* Clear file selection on load */
	reset_wiretype_upload_form();

	console.log("loaded import/kris/wiretype_upload.js"); 
});


