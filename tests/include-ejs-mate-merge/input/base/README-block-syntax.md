# <%= title %>

<%- block('head') %>

## Description

<% block('description') %>
The default description using block syntax
<% end %>

## Content

<%- body %>

<%- block('footer').toString() %>
