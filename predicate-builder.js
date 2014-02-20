/*
	predicate should follow:
	{
		type: expression,
		expression:{
			type: AND | OR,
			predicates: []
		}
	}
	or
	{
		type: constraint,
		constraint:{
			whereKey: 'somePropertyName',
			operator: '[]',
			operand: {}
		}
	}

	examples:
	(firstName == 'dave' && ((lastName == 'pollot' || lastName == 'church') || age > 25 ))
	PredicateBuilder.expression().constraint('firstName').equalTo('dave').andExpression().constraint('lastName').containedIn(['pollot', 'church']).or().constraint('age').greaterThan(25);
	would be represented as:
	{
		type: EXPRESSION,
		expression: {
			type: AND,
			predicates: [
				{
					type: CONSTRAINT,
					constraint: {
						whereKey: 'firstName',
						operator: EQUAL_TO,
						operand: 'dave'
					}
				},
				{
					type: EXPRESSION,
					expression: {
						type: OR,
						predicates:[
							{
								type: CONSTRAINT,
								constraint: {
									whereKey: 'lastName',
									operator: 'CONTAINED_IN',
									operand: ['pollot', 'church']
								}
							},
							{
								type: CONSTRAINT,
								constraint: {
									whereKey: 'age',
									operator: GREATER_THAN,
									operand: 25
								}
							}
						]
					}
				}
			]
		}
	}
*/

angular.module("services.predicates", []).provider('PredicateBuilder', function(){
	// enum representing the list of supported operators
	var Operators = {
		containedIn: 'containedIn',
		contains: 'contains',
		containsAll: 'containsAll',
		equalTo: 'equalTo',
		notEqualTo: 'notEqualTo',
		greaterThan: 'greaterThan',
		lessThan: 'lessThan'
	}

	// enum representing the list of supported expression types
	var ExpressionTypes = {
		and: 'and',
		or: 'or'
	}

	// enum representing the list of supported predicate types
	var PredicateTypes = {
		constraint: 'constraint',
		expression: 'expression'
	}

	var PredicateEvaluator = {
		// Static helper
		// evaluates the given item and returns its json object representation
		evaluate: function(item){
			// need to climb the tree to get the root item
			var temp = item.parent || item;
			while(undefined != temp.parent){
				temp = temp.parent;
			}
			
			// now evaluate
			var expr = this.evaluateRecursively(temp);
			return JSON.parse(JSON.stringify(expr))
		},
		// internal helper
		// recursively evaluates the given item
		evaluateRecursively: function(item){
			// this is just a constraint
			if(undefined == item.predicates){
				return this.evaluateConstraint(item);
			}else{
				return this.evaluateExpression(item);
			}
		},
		// Evaluates the given constraint and returns its json object representation
		evaluateConstraint: function(constraint){
			return {
				type: PredicateTypes.constraint,
				constraint: {
					whereKey: constraint.whereKey,
					operator: constraint.operator,
					operand: constraint.operand
				}
			}
		},
		// Evaluates the given expression and returns its json object representation
		evaluateExpression: function(expression){
			var predicates = [];
			for(var i=0; i<expression.predicates.length; i++){
				predicates.push(this.evaluateRecursively(expression.predicates[i]));
			}
			return {
				type: PredicateTypes.expression,
				expression: {
					type: expression.type,
					predicates: predicates
				}
			}
		}
	}

	/*
		Represents an expression
		Params
			parent:  if provided, specifies the exprssion to which this expressions belongs
	*/
	var Expression = function(parent){
		this.parent = parent;
		// Gets or sets the type - and | or
		this.type = {};
		// Gets or sets the list of predicates belonging to this expression
		this.predicates = [];

		// Evaluate this expression and return its json representation
		this.evaluate = function(){
			return PredicateEvaluator.evaluate(this);
		};

		// Add a constraint to this expression and return the added contraint
		this.constraint = function(whereKey){
			var c = new Constraint(whereKey, this);
			this.predicates.push(c);
			return c;
		};

		// Add an expression to this expression and return the added expression
		this.expression = function(){
			var expr = new Expression(this);
			this.predicates.push(expr);
			return expr;
		};

		// once an expression or constraint has been added, set up the expression
		// to add another predicate
		this.and = function(){
			// cannot call and if there are currently no predicates
			if(this.predicates.length <= 0){
				throw "Cannot call method: and() on an expression with no existing predicates.  You must first add an expression or constraint";
			}

			this.type = ExpressionTypes.and;
			return this;
		};

		// once an expression or constraint has been added, set up the expression
		// to add another predicate
		this.or = function(){
			// cannot call or if there are currently no predicates
			if(this.predicates.length <= 0){
				throw "Cannot call method: or() on an expression with no existing predicates.  You must first add an expression or constraint";
			}

			this.type = ExpressionTypes.or;
			return this;
		};
	}

	/*
		Represents a constraint
		Params:
			whereKey:  the key/property name to test
			parent:    if provided, specifies the expression to which this constraint belongs
	*/
	var Constraint = function(whereKey, parent){
		this.parent = parent;
		// gets or sets the key/property name to test
		this.whereKey = whereKey;
		// gets or sets the operator for the condition (see the list of available operators)
		this.operator = {};
		// gets or sets the value to test against
		this.operand = {};

		// Evaluates this constraint (returns the json object representation of the constraint)
		this.evaluate = function(){
			return PredicateEvaluator.evaluate(this);
		};

		// sets the operand to the given val, and sets the operator
		this.equalTo = function(val){
			this.operator = Operators.equalTo;
			this.operand = val;
			return this.parent || this;
		};

		// sets the operand to the given val, and sets the operator
		this.notEqualTo = function(val){
			this.operator = Operators.notEqualTo;
			this.operand = val;
			return this.parent || this;
		};

		// sets the operand to the given val, and sets the operator
		this.greaterThan = function(val){
			this.operator = Operators.greaterThan;
			this.operand = val;
			return this.parent || this;
		};

		// sets the operand to the given val, and sets the operator
		this.lessThan = function(val){
			this.operator = Operators.lessThan;
			this.operand = val;
			return this.parent || this;
		};

		// sets the operand to the given val, and sets the operator
		this.containedIn = function(arr){
			this.operator = Operators.containedIn;
			this.operand = arr;
			return this.parent || this;
		};

		// sets the operand to the given val, and sets the operator
		this.contains = function(val){
			this.operator = Operators.contains;
			this.operand = val;
			return this.parent || this;
		};

		// sets the operand to the given val, and sets the operator
		this.containsAll = function(arr){
			this.operator = Operators.containsAll;
			this.operand = arr;
			return this.parent || this;
		}
	}

	return {
		$get: function(){
			return {
				// Returns a new constraint:
				// Use this method when you want only one condition (you don't need to and/or predicates)
				constraint: function(whereKey){
					return new Constraint(whereKey);
				},
				// Returns a new expression:
				// Use this method when you want to and/or expressions/constraints
				expression: function(){
					return new Expression();
				}
			}
		}
	}
});
