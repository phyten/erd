/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class ERD {
  constructor(name, elem, edges) {
    this.connect_arrows = this.connect_arrows.bind(this);
    this.handle_drag = this.handle_drag.bind(this);
    this.handle_save = this.handle_save.bind(this);
    this.handle_add_column = this.handle_add_column.bind(this);
    this.handle_change_column_type = this.handle_change_column_type.bind(this);
    this.handle_rename_column = this.handle_rename_column.bind(this);
    this.handle_rename_model = this.handle_rename_model.bind(this);
    this.handle_add_column_click = this.handle_add_column_click.bind(this);
    this.handle_cancel_click = this.handle_cancel_click.bind(this);
    this.handle_text_elem_click = this.handle_text_elem_click.bind(this);
    this.handle_remove_model_click = this.handle_remove_model_click.bind(this);
    this.handle_new_model_add_column_click = this.handle_new_model_add_column_click.bind(this);
    this.handle_open_migration_click = this.handle_open_migration_click.bind(this);
    this.handle_close_migration_click = this.handle_close_migration_click.bind(this);
    this.name = name;
    this.elem = elem;
    this.edges = edges;
    this.paper = Raphael(this.name, this.elem.data('svg_width'), this.elem.data('svg_height'));
    this.setup_handlers();
    const models = this.elem.find('.model');
    this.models = {};
    for (let model of Array.from(models)) {
      this.models[$(model).data('model_name')] = model;
    }
    this.connect_arrows(this.edges);
  }

  upsert_change(action, model, column, from, to) {
    const rows = (Array.from($('#changes > tbody > tr')).map((tr) => $(tr).find('td')));
    let existing = null;
    $(rows).each(function(i, row) {
      if ((action === $(row[0]).html()) && (model === $(row[1]).html()) && (column === $(row[2]).html())) { return existing = row; }
    });
    if (existing === null) {
      $('#changes > tbody').append(`\
<tr>
  <td data-name="action">${action}</td>
  <td data-name="model">${model}</td>
  <td data-name="column">${column}</td>
  <td data-name="from">${from}</td>
  <td data-name="to">${to}</td>
</tr>\
`);
    } else {
      $(existing[3]).text(from);
      $(existing[4]).text(to);
    }
    return $('#changes').show();
  }

  positions(div) {
    const [left, width, top, height] = Array.from([parseFloat(div.css('left')), parseFloat(div.css('width')), parseFloat(div.css('top')), parseFloat(div.css('height'))]);
    return {left, right: left + width, top, bottom: top + height, center: {x: (left + left + width) / 2, y: (top + top + height) / 2}, vertex: {}};
  }

  connect_arrows(edges) {
    return $.each(edges, (i, edge) => {
      return this.connect_arrow(edge, $(this.models[edge.from]), $(this.models[edge.to]));
    });
  }

  connect_arrow(edge, from_elem, to_elem) {
    //TODO handle self referential associations
    let path;
    if (from_elem.attr('id') === to_elem.attr('id')) { return; }

    if (edge.path != null) { edge.path.remove(); }

    const from = this.positions(from_elem);
    const to = this.positions(to_elem);
    //FIXME terrible code
    const a = (to.center.y - from.center.y) / (to.center.x - from.center.x);
    const b = from.center.y - (from.center.x * a);

    const x2y = x => (a * x) + b;
    const y2x = y => (y - b) / a;

    if (from.center.x > to.center.x) {
      [from.vertex.x, from.vertex.y] = Array.from([from.left, x2y(from.left)]);
      [to.vertex.x, to.vertex.y] = Array.from([to.right, x2y(to.right)]);
    } else {
      [from.vertex.x, from.vertex.y] = Array.from([from.right, x2y(from.right)]);
      [to.vertex.x, to.vertex.y] = Array.from([to.left, x2y(to.left)]);
    }
    for (let rect of [from, to]) {
      if (rect.vertex.y < rect.top) {
        [rect.vertex.x, rect.vertex.y, rect.vertex.direction] = Array.from([y2x(rect.top), rect.top, 'v']);
      } else if (rect.vertex.y > rect.bottom) {
        [rect.vertex.x, rect.vertex.y, rect.vertex.direction] = Array.from([y2x(rect.bottom), rect.bottom, 'v']);
      } else {
        from.vertex.direction = 'h';
      }
    }

    if (from.vertex.direction === 'h') {
      path = `M${Math.floor(from.vertex.x)} ${Math.floor(from.vertex.y)}H${Math.floor((from.vertex.x + to.vertex.x) / 2)} V${Math.floor(to.vertex.y)} H${Math.floor(to.vertex.x)}`;
    } else {
      path = `M${Math.floor(from.vertex.x)} ${Math.floor(from.vertex.y)}V${Math.floor((from.vertex.y + to.vertex.y) / 2)} H${Math.floor(to.vertex.x)} V${Math.floor(to.vertex.y)}`;
    }

    return edge.path = this.paper.path(path).attr({'stroke-width': 2, opacity: 0.5, 'arrow-end': 'classic-wide-long'});
  }

  setup_handlers() {
    this.setup_click_handlers();
    this.setup_submit_handlers();
    this.setup_migration_event_handlers();
    return $('div.model').draggable({drag: this.handle_drag});
  }

  handle_drag(ev, ui) {
    const target = $(ev.target);
    target.addClass('noclick');
    const model_name = target.data('model_name');
    const from = target.data('original_position');
    const to = [target.css('left').replace(/px$/, ''), target.css('top').replace(/px$/, '')].join();
    this.upsert_change('move', model_name, '', '', to);
    return this.connect_arrows(this.edges.filter(e=> (e.from === model_name) || (e.to === model_name)));
  }

  setup_click_handlers() {
    $('div.model_name_text, span.column_name_text, span.column_type_text').on('click', this.handle_text_elem_click);
    $('div.model a.add_column').on('click', this.handle_add_column_click);
    $('div.model a.cancel').on('click', this.handle_cancel_click);
    $('div.model a.close').on('click', this.handle_remove_model_click);
    $('#new_model_add_column').on('click', this.handle_new_model_add_column_click);
    $('div.model a.cancel').on('click', this.handle_cancel_click);
    $('div#open_migration').on('click', this.handle_open_migration_click);
    return $('div#close_migration').on('click', this.handle_close_migration_click);
  }

  setup_submit_handlers() {
    $('form.rename_model_form').on('submit', this.handle_rename_model);
    $('form.rename_column_form').on('submit', this.handle_rename_column);
    $('form.alter_column_form').on('submit', this.handle_change_column_type);
    $('form.add_column_form').on('submit', this.handle_add_column);
    return $('#changes_form').on('submit', this.handle_save);
  }

  setup_migration_event_handlers() {
    $('#migration_status tr input').on('click', function() {
      return $(this).parents('tr').toggleClass('active');
    });
    return $('#migration_status thead td button').on('click', function(ev) {
      ev.preventDefault();
      return $('#migration_status').toggleClass('show_all_migrations');
    });
  }

  handle_save(ev) {
    const changes = $('#changes > tbody > tr').map(function() {
      const change = {};
      $(this).find('td').each(function() {
        const name = $(this).data('name');
        const value = $(this).html();
        return change[name] = value;
      });
      return change;
    }).toArray();
    return $('#changes_form').find('input[name=changes]').val(JSON.stringify(changes));
  }

  handle_add_column(ev) {
    ev.preventDefault();
    const target = $(ev.target);
    const name = target.find('input[name=name]').val();
    if (name === '') { return; }

    const model = target.find('input[name=model]').val();
    const type  = target.find('input[name=type]').val();
    this.upsert_change('add_column', model, `${name}(${type})`, '', '');

    const name_span = $("<span/>", {class: 'column_name_text'})
      .append(name);

    const type_span = $("<span/>", {class: 'column_type_text unsaved'})
      .append(type);

    const li_node = $("<li/>", {class: 'column unsaved'}).append(name_span).append("&nbsp;").append(type_span);

    return target.hide()
      .parent()
      .siblings('.columns')
      .find('ul').append(li_node).end()
      .end()
      .find('a.add_column').show();
  }

  handle_change_column_type(ev) {
    ev.preventDefault();
    const target = $(ev.target);
    const to = target.find('input[name=to]').val();
    if (to === '') { return; }

    const model  = target.find('input[name=model]').val();
    const column = target.find('input[name=column]').val();
    const type   = target.find('input[name=type]').val();
    if (to !== type) {
      this.upsert_change('alter_column', model, column, type, to);
    }

    return target.hide()
      .siblings('.column_type_text').text(to).show().addClass('unsaved')
      .parents('.column').addClass('unsaved');
  }

  handle_rename_column(ev) {
    ev.preventDefault();
    const target = $(ev.target);
    const to = target.find('input[name=to]').val();
    if (to === '') { return; }

    const model = target.find('input[name=model]').val();
    const column = target.find('input[name=column]').val();
    if (to !== column) {
      this.upsert_change('rename_column', model, column, column, to);
    }

    return target.hide()
      .siblings('.column_name_text').text(to).show()
      .parents('.column').addClass('unsaved');
  }

  handle_rename_model(ev) {
    ev.preventDefault();
    const target = $(ev.target);
    const to = target.find('input[name=to]').val();
    if (to === '') { return; }

    const model = target.find('input[name=model]').val();
    if (to !== model) {
      this.upsert_change('rename_model', model, '', model, to);
    }

    return target.hide()
      .siblings('.model_name_text').text(to).show().addClass('unsaved');
  }

  handle_add_column_click(ev) {
    ev.preventDefault();
    const target = $(ev.currentTarget);

    const m = target.parents('div.model');
    if (m.hasClass('noclick')) {
      m.removeClass('noclick');
      return false;
    }

    return target.hide()
      .next('form').show()
      .find('a.cancel').show().end()
      .find('input[name=type]').val('string').end()
      .find('input[name=name]').val('').focus();
  }

  handle_cancel_click(ev) {
    ev.preventDefault();
    const target = $(ev.currentTarget);

    const m = target.parents('div.model');
    if (m.hasClass('noclick')) {
      m.removeClass('noclick');
      return false;
    }

    return target.hide()
      .parent('form').hide()
      .prev('a.add_column, span, div').show();
  }


  handle_text_elem_click(ev) {
    const target = $(ev.currentTarget);
    const text = target.text();

    const m = target.parents('div.model');
    if (m.hasClass('noclick')) {
      m.removeClass('noclick');
      return false;
    }

    return target.hide()
      .next('form').show()
      .find('a.cancel').show().end()
      .find('input[name=to]').val(text).focus();
  }

  handle_remove_model_click(ev) {
    ev.preventDefault();

    const target = $(ev.target);
    const parent = target.parent();

    const m = target.parents('div.model');
    if (m.hasClass('noclick')) {
      m.removeClass('noclick');
      return false;
    }

    if (!confirm('remove this table?')) { return; }

    const model_name = m.data('model_name');
    window.erd.upsert_change('remove_model', model_name, '', '', '');
    parent.hide();

    $.each(this.edges, (i, edge) => {
      if ((edge.from === model_name) || (edge.to === model_name)) { return this.edges.splice(i, 1); }
    });
    this.paper.clear();
    return this.connect_arrows(this.edges);
  }

  handle_new_model_add_column_click(ev) {
    ev.preventDefault();
    const target = $(ev.currentTarget);

    return target.parent().siblings('table').append('<tr><td><input type="text" /></td><td class="separator">:</td><td><input type="text" value="string" /></td></tr>').find('tr:last > td > input:first').focus();
  }


  handle_open_migration_click(ev) {
    ev.preventDefault();

    const target = $(ev.currentTarget);
    const text = target.text();

    const m = target.parents('div.model');
    if (m.hasClass('noclick')) {
      m.removeClass('noclick');
      return false;
    }

    return target.hide()
      .next('div').show()
      .find('#close_migration').show();
  }


  handle_close_migration_click(ev) {
    ev.preventDefault();

    const target = $(ev.currentTarget);
    const text = target.text();

    const m = target.parents('div.model');
    if (m.hasClass('noclick')) {
      m.removeClass('noclick');
      return false;
    }

    return target.hide()
      .parent().hide()
      .prev('div').show();
  }
}

$(function() {
  window.erd = new ERD('erd', $('#erd'), window.raw_edges);

  $('#erd').css('height', window.innerHeight);
  $(window).on('resize', () => $('#erd').css('height', window.innerHeight));

  $("#open_migration").click(function() {
    return $('#close_migration, #open_create_model_dialog').css('right', ($('#migration').width() + ($(this).width() / 2)) - 5);
  });

  $("#close_migration").click(() => $('#open_create_model_dialog').css('right', 15));

  $('#open_up').click(function() {
    $('#migration_status .up').addClass('open');
    return $('#migration_status .down').removeClass('open');
  });

  $('#open_down').click(function() {
    $('#migration_status .down').addClass('open');
    return $('#migration_status .up').removeClass('open');
  });

  $('#close_all').click(() => $('#migration_status tr').removeClass('open'));

  $('#create_model_form').dialog({
    autoOpen: false,
    height: 450,
    width: 450,
    modal: true,
    buttons: {
      'Create Model'() {
        const model = $('#new_model_name').val();
        let columns = '';
        $('#create_model_table > tbody > tr').each(function(i, row) {
          const [name, type] = Array.from((Array.from($(row).find('input')).map((v) => $(v).val())));
          if (name) { return columns += `${name}${type ? `:${type}` : ''} `; }
        });
        window.erd.upsert_change('create_model', model, columns, '', '');
        $(this).find('table > tbody > tr').each(function(i, row) {
          if (i >= 1) { return row.remove(); }
        });
        $(this).find('input').val('');
        $(this).find('input[name=new_model_column_type_1]').val('string');

        return $(this).dialog('close');
      },
      Cancel() {
        return $(this).dialog('close');
      }
    }
  });

  return $('#open_create_model_dialog').click(function(ev) {
    ev.preventDefault();
    return $('#create_model_form').dialog('open');
  });
});