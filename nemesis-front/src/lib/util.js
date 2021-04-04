function updateLocalItemStatus(items, setItems, uuid, newStatus) {
  items = items.map((item) => {
    if (item.uuid === uuid) {
      item.status = newStatus;
    }
    return item;
  });
  setItems([...items]);
}

async function getSpecificUuidItem(itemGetFn, uuid) {
  let res = await itemGetFn();
  if (res.success) {
    const items = res.items;
    return (items.filter((item) => item.id === uuid))[0] ?? null;
  } else {
    return null;
  }
}

async function waitFotStatusChanged(itemGetFn, uuid, desiredStatus, doneCb) {
  const target_item = await getSpecificUuidItem(itemGetFn, uuid);
  if (target_item) {
    if (target_item.status !== desiredStatus) {
      window.setTimeout(
        () => waitFotStatusChanged(itemGetFn, uuid, desiredStatus, doneCb),
        5000
      );
    } else {
      doneCb();
    }
  }
}

export {updateLocalItemStatus, getSpecificUuidItem, waitFotStatusChanged}