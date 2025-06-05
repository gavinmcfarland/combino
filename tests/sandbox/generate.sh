#!/bin/bash

# Create output directory
mkdir -p output

# Generate TypeScript project
combino \
	templates/base \
	templates/typescript \
	-o output/ts-project \
	-c example.combino \
	-d language=ts

# Generate JavaScript project
combino \
	templates/base \
	templates/typescript \
	-o output/js-project \
	-c example.combino \
	-d language=js

echo "Generated projects in output/ts-project and output/js-project"
