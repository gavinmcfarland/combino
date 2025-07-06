# <%= title %>

<%- block('head') %>

## Description

<% block('description') %>
The default description
<% end %>

## Content

<%- body %>

<%- block('footer').toString() %>
