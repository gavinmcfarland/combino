# <%= title %>

<%- block('head') %>

## Description

<%= block('description') || 'The default description' %>

## Content

<%- body %>

<%- block('footer').toString() %>
