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



/* Initialises a new account record. 
 * Returns the id of the newly created acccount.
 */
CREATE OR REPLACE FUNCTION create_account(p_account_name TEXT)
RETURNS INTEGER AS $$
DECLARE rv INTEGER;
BEGIN

	INSERT INTO account(name)
	VALUES(p_account_name)
	RETURNING id INTO rv;

	RETURN rv;
END
$$ LANGUAGE plpgsql;



/* Given a vertical position number (between 1 and 676),
 * returns the designation used to identify this vertical using
 * the common UK commercial radio convention beginning A, B, C...
 * continuing with X, Y, Z, AA, AB, AC ..... AZ.
 */
CREATE OR REPLACE FUNCTION regular_vertical_designation_from_position(
	vertical_position INTEGER
)
RETURNS TEXT AS $$
BEGIN

	/* Validation */
	CASE
		WHEN vertical_position IS NULL THEN
			RAISE EXCEPTION 'position cannot be NULL';
		WHEN NOT vertical_position BETWEEN 1 AND 676 THEN
			RAISE EXCEPTION 'position must be between 1 and 676';
		ELSE -- validation OK
	END CASE;

	/* Stored position counts from 1, but zero-based values are needed for the maths */
	vertical_position := vertical_position - 1;
	
	/* Do translation */
	IF vertical_position > 25 THEN
		/* Two-character return value */
		RETURN CONCAT(
			chr((vertical_position / 26) + 64),
			chr((vertical_position % 26) + 65)
		);
	ELSE
		RETURN chr((vertical_position % 26) + 65);
	END IF;

END
$$ LANGUAGE plpgsql;



/* Given a block position number, returns the designation used to 
 * identify the block. Basically the same as the position number,
 * but with zero-padding to match the highest position number. For 
 * example, if the maximum position number is 100, block 1 will 
 * receive the designation '001'.
 */
CREATE OR REPLACE FUNCTION regular_block_designation_from_position(
	block_position INTEGER,
	maximum_position INTEGER
)
RETURNS TEXT AS $$
DECLARE characters_wanted INTEGER;
BEGIN

	/* Validation */
	CASE
		WHEN block_position IS NULL THEN
			RAISE EXCEPTION 'position cannot be NULL';
		WHEN block_position < 1 THEN
			RAISE EXCEPTION 'position must be greater than 1';
		WHEN maximum_position IS NULL THEN
			RAISE EXCEPTION 'maximum position cannot be NULL';
		WHEN maximum_position < 1 THEN
			RAISE EXCEPTION 'maximum position must be greater than 1';
		WHEN maximum_position < block_position THEN
			RAISE EXCEPTION 'maximum position cannot be less than position';
		ELSE -- validation OK
	END CASE;

	characters_wanted := char_length(CAST(maximum_position AS TEXT));
	RETURN lpad(CAST(block_position AS TEXT), characters_wanted, '0');

END
$$ LANGUAGE plpgsql;




/* Initialises a regular, rectangular frame to specified dimensions,
 * creating the frame record and inserting the required number of
 * empty block positions.
 * 
 * Returns the id of the newly created frame.
 */
CREATE OR REPLACE FUNCTION create_regular_frame(
	p_account_id INTEGER,
	p_name TEXT,
	p_vertical_count INTEGER,
	p_row_count INTEGER
)
RETURNS INTEGER AS $$
DECLARE frame_id INTEGER;
DECLARE vertical_id INTEGER;
DECLARE vertical_designation TEXT;
DECLARE block_designation TEXT;
DECLARE maximum_size INTEGER := 500;
BEGIN
	
	/* Validation */
	CASE
		WHEN p_vertical_count IS NULL THEN
			RAISE EXCEPTION 'number of verticals cannot be NULL';
		WHEN p_vertical_count < 1 THEN
			RAISE EXCEPTION 'number of verticals cannot be less than 1';
		WHEN p_vertical_count > maximum_size THEN
			RAISE EXCEPTION 'number of verticals cannot be more than %', maximum_size;

		WHEN p_row_count IS NULL THEN
			RAISE EXCEPTION 'number of blocks in a vertical cannot be NULL';
		WHEN p_row_count < 1 THEN
			RAISE EXCEPTION 'number of blocks in a vertical cannot be less than 1';
		WHEN p_row_count > maximum_size THEN
			RAISE EXCEPTION 'number of blocks in a vertical cannot be more than %', maximum_size;

		ELSE -- validation OK
	END CASE;
		
	/* Create the frame */
	INSERT INTO frame(account_id, name)
	VALUES(p_account_id, p_name)
	RETURNING id INTO frame_id;

	RAISE DEBUG 'Inserted new frame with id:%', frame_id;

	/* Initialise the columns with empty blocks */
	FOR vertical_position IN 1..p_vertical_count LOOP
		INSERT INTO vertical(frame_id, position, designation)
		VALUES(
			frame_id,
			vertical_position,
			regular_vertical_designation_from_position(vertical_position)
		)
		RETURNING id, designation INTO vertical_id, vertical_designation;
		RAISE DEBUG 'Inserted vertical with designation %', vertical_designation;

		FOR block_position IN 1..p_row_count LOOP
			INSERT INTO block(vertical_id, position, designation)
			VALUES(
				vertical_id,
				block_position,
				regular_block_designation_from_position(block_position, p_row_count)
			)
			RETURNING designation INTO block_designation;
			RAISE NOTICE 'Inserted empty block with designation %', CONCAT(vertical_designation, block_designation);
		END LOOP;
	END LOOP;


	RETURN frame_id;
END
$$ LANGUAGE plpgsql;


/* Returns the number of pins for a given circuit_id
 */
CREATE OR REPLACE FUNCTION count_pins_for_circuit_id(
	p_circuit_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE rv INTEGER;
BEGIN
	SELECT COUNT(*) FROM pin INTO rv WHERE circuit_id = p_circuit_id;
	RETURN rv;
END
$$ LANGUAGE plpgsql;


/* Returns the jumper_template_id corresponding to the given jumper_template_designation
 * Raises an exception if the specified designation does not exist
 */
CREATE OR REPLACE FUNCTION jumper_template_designation_to_id(p_jumper_template_designation TEXT)
RETURNS INTEGER AS $$
DECLARE rv INTEGER;
BEGIN
	SELECT id FROM jumper_template INTO rv
	WHERE designation = p_jumper_template_designation;

	IF rv IS NULL THEN
		RAISE EXCEPTION 'no jumper template has designation %', p_jumper_template_designation;
	END IF;

	RETURN rv;
END
$$ LANGUAGE plpgsql;



/* Returns the number of wires associated with a jumper template, most commonly two
 * for a standard balanced pair.
 * Raises an exception if the specified jumper template does not exist.
 */
CREATE OR REPLACE FUNCTION count_wires_for_jumper_template_id(p_jumper_template_id INTEGER)
RETURNS INTEGER AS $$
DECLARE jumper_wire_count INTEGER;
BEGIN

	SELECT count(*) INTO jumper_wire_count
	FROM jumper_template_wire
	JOIN jumper_template ON (jumper_template.id = jumper_template_wire.jumper_template_id)
	WHERE jumper_template.id = p_jumper_template_id
	GROUP BY jumper_template_id;

	IF jumper_wire_count IS NULL THEN
		RAISE EXCEPTION 'jumper_template_id % is invalid', p_jumper_template_id;
	END IF;

	RETURN jumper_wire_count;
END
$$ LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION wire_colour_id_for_jumper_template_position(
	p_jumper_template_id INTEGER,
	p_pin_position INTEGER
)
RETURNS INTEGER AS $$
DECLARE rv INTEGER;
BEGIN

	SELECT colour_id INTO rv
	FROM jumper_template_wire
	WHERE position = p_pin_position
	AND jumper_template_id = p_jumper_template_id;

	IF rv IS NULL THEN
		RAISE EXCEPTION 'Not able to find a wire for jumper template %, pin position %',
			p_jumper_template_id,
			p_pin_position;
	END IF;

	RETURN rv;
END
$$ LANGUAGE plpgsql;

