# <%= title %>

<%- block('head') %>

## Description

<% block('description') %>
This default should be overridden
<% end %>

## Content

<%- body %>

<%- block('footer').toString() %>
