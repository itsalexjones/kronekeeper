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

CREATE OR REPLACE FUNCTION frame_id_for_pin_id(
	p_pin_id INTEGER
)
RETURNS INTEGER AS $$
BEGIN

	RETURN vertical.frame_id
	FROM pin
	JOIN circuit ON (circuit.id = pin.circuit_id)
	JOIN block ON (block.id = circuit.block_id)
	JOIN vertical ON (vertical.id = block.vertical_id)
	WHERE pin.id = p_pin_id;
END
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION pin_ids_are_connected(
	p_pin_id_1 INTEGER,
	p_pin_id_2 INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN

	RETURN EXISTS (
		SELECT 1
		FROM connection AS connection1
		JOIN connection AS connection2 ON (connection2.jumper_wire_id = connection1.jumper_wire_id)
		WHERE connection1.pin_id = p_pin_id_1
		AND connection2.pin_id = p_pin_id_2
	);
END
$$ LANGUAGE plpgsql;




CREATE OR REPLACE VIEW pin_info AS
SELECT
	pin.id,
	pin.position AS position,
	pin.name AS name,
	pin.wire_reference AS wire_reference,
	circuit.id AS circuit_id,
	circuit.name AS circuit_name,
	circuit.cable_reference,
	block.id AS block_id,
	block.name AS block_name,
	vertical.designation AS vertical_designation,
	block.designation AS block_designation,
	circuit.designation AS circuit_designation,
	pin.designation AS pin_designation,
	CONCAT(vertical.designation, block.designation, '.', circuit.designation, pin.designation) AS full_designation,
	CONCAT(vertical.designation, block.designation, '.', circuit.designation) AS circuit_full_designation,
	frame.id AS frame_id,
	frame.name AS frame_name,
	circuit.connection
FROM pin
JOIN circuit ON (circuit.id = pin.circuit_id)
JOIN block ON (block.id = circuit.block_id)
JOIN vertical ON (vertical.id = block.vertical_id)
JOIN frame ON (frame.id = vertical.frame_id);


