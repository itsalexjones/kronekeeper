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


require([
	'backbone',
        'jquery',
	'jqueryui'
], function (

) {
        'use strict';



	var Circuit_Model = Backbone.Model.extend({

		idAttribute: 'circuit_id',
		urlRoot: '/api/circuit',

		defaults: {
			block_id: null,
			circuit_id: null,
			designation: null,
			name: null,
			cable_reference: null,
			jumpers: []
		}
	});


	var Circuits_Collection = Backbone.Collection.extend({

		model: Circuit_Model,
		url: function() {
			return '/api/block/' + this.block_id;
		},

		initialize: function(args) {
			this.block_id = args.block_id;
		},

		parse: function(data) {
			return data.circuits;
		},

		provision_jumper_fields: function(required_count) {
			/* This routine will ensure at least the specified
			 * number of jumper field cells are available. This
			 * collection keeps track of how many should be
			 * provided, but delegates their creation to views
			 * which listen to the provision_jumper_fields event.
			 */
			this.trigger("provision_jumper_fields", this.jumper_count);
		}
	});


	var Circuit_View = Backbone.View.extend({

		tagName: 'tr',
		className: 'circuit',

		events: {
			'click a.add_jumper' : 'add_jumper',
			'input .circuit_name input' : 'circuit_name_input',
			'change .circuit_name input' : 'circuit_name_change',
			'keypress .circuit_name input' : 'circuit_name_keypress',
			'input .cable_reference input' : 'cable_reference_input',
			'change .cable_reference input' : 'cable_reference_change',
			'keypress .cable_reference input' : 'cable_reference_keypress',
		},

		initialize: function() {
			this.listenTo(
				this.model,
				'sync',
				this.model_synced
			);
			this.listenTo(
				this.model.collection,
				"table_structure_rendered",
				this.render_jumpers
			);
			this.listenTo(
				this.model.collection,
				"provision_jumper_fields",
				this.provision_jumper_fields
			);
		},

		template: _.template( $('#row_template').html() ),

		render: function() {
			/* Jumpers are populated once the basic table
			 * structure is in place so that we can handle
			 * any requirement for extra columns without
			 * race conditions.
			 */
			var json = this.model.toJSON();
			this.$el.html(this.template(json));
			return this;
		},

		render_jumpers: function(jumper_text) {

			var jumpers = this.model.get("jumpers");
			var jumper_count = jumpers.length;

			/* Ensure we have enough blank cells for all jumpers */
			while(this.$el.children("td.jumper").not(".inactive").size() < jumper_count) {
				this.add_jumper();
			}

			var cells = this.$el.children("td.jumper");
			jumpers.forEach(function(jumper, index) {
				$(cells[index]).text(jumper);
			});
		},

		add_jumper: function(e) {

			var inactive_cell_count = this.$el.children("td.jumper.inactive").size();

			if(inactive_cell_count < 1) {
				/* Need to provision another column */
				var jumper_cell_count = this.$el.children("td.jumper").size();
				this.model.collection.trigger(
					"provision_jumper_fields",
					jumper_cell_count + 1
				);
			}

			/* Activate an inactive cell */
			var template = $('#active_jumper_cell_template').html();
			this.$el.children("td.jumper.inactive").first().replaceWith(template);
		},


		circuit_name_keypress: function(e) {
			this.reset_on_escape_key(e, 'name');
		},

		cable_reference_keypress: function(e) {
			this.reset_on_escape_key(e, 'cable_reference');
		},

		reset_on_escape_key(e, attribute_name) {
			if(e.keyCode == 27) {
				e.target.value = this.model.get(attribute_name);
				e.target.parentNode.classList.remove('change_pending');
			}
		},


		circuit_name_input: function(e) {
			this.highlight_change(e, 'name');
		},

		cable_reference_input: function(e) {
			this.highlight_change(e, 'cable_reference');
		},

		highlight_change: function(e, attribute_name) {
			if(e.target.value != this.model.get(attribute_name)) {
				e.target.parentNode.classList.add('change_pending');
			}
			else {
				e.target.parentNode.classList.remove('change_pending');
			}
		},


		circuit_name_change: function(e) {
			this.save_data({name: e.target.value});
		},

		cable_reference_change: function(e) {
			this.save_data({cable_reference: e.target.value});
		},

		save_data: function(data) {
			this.model.save(data, {
				patch: true,
				success: function(model, response, options) {
					console.log("circuit data saved");
				},
				error: function(model, xhr, options) {
					console.log("ERROR saving circuit data");
				}
			});
		},


		model_synced: function(model, response, options) {
			/* Clear field highlighting and flash green to indicate successful save
			 * Server returns the changed fields to confirm which have been updated
			 */
			if('name' in response) {
				this.$el.children("td.circuit_name").removeClass('change_pending');
				this.$el.children("td.circuit_name").effect("highlight", {color: "#deffde"}, 500);
			};
			if('cable_reference' in response) {
				this.$el.children("td.cable_reference").removeClass('change_pending');
				this.$el.children("td.cable_reference").effect("highlight", {color: "#deffde"}, 500);
			};
		},

		provision_jumper_fields: function(required_count) {

			var jumper_cell_count = this.$el.children("td.jumper").size();
			var td_buttons = this.$el.children("td.circuit_buttons").first();
			var template = $('#inactive_jumper_cell_template').html();

			while(jumper_cell_count < required_count) {
				/* Insert new cell in row before the buttons */
				td_buttons.before(template);
				jumper_cell_count ++;
			}
		}

	});


	var Block_View = Backbone.View.extend({

		el: '#block_table_body',

		initialize: function() {
			this.listenTo(
				this.collection,
				'reset',
				this.render
			);
			this.listenTo(
				this.collection,
				'provision_jumper_fields',
				this.set_jumper_columns
			);
		},

		render: function() {
			console.log("rendering Block_View");
			this.collection.each(function(model) {
				var row = new Circuit_View({model: model});
				$('#block_table_body').append(row.render().$el);
			}, this);
			this.collection.trigger("table_structure_rendered");
			return this;
		},

		set_jumper_columns: function(column_count) {
			$('#jumper_heading').attr('colspan', column_count);
		}
	});



	var circuit_list = new Circuits_Collection({block_id: window.block_id});
	var view = new Block_View({collection: circuit_list});

	circuit_list.fetch({
		reset: true,
		success: function(collection, response, options) {
			console.log("fetched circuit list OK");
		},
		error: function(collection, response, options) {
			console.log("ERROR: failed to fetch circuit list");
		}
	});

	console.log("loaded block.js");

});


