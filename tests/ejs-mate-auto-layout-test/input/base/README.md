# <%= title %>

<%- block('head') %>

<%= block('description') || 'The default description' %>

## Content

<%- body %>

<%- block('footer').toString() %>
