# <%- name %>

<% if (attribution) { %>
<%- attribution %>
<% } %>

<% if (description) { %>

## Description

<%- description %>
<% } %>

<% if (framework) { %>
This project uses <%- framework %>.
<% } %>

<% if (missingVar) { %>
This should not appear.
<% } %>

<%- missingVar %>
