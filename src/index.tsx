import { renderRoot } from "../core";

function Test2(props: any) {
  return <span>{props.children}</span>;
}

function Test() {
  this.useCreated(() => {
    this.count = 0;
  });
  this.useMounted(() => {
    this.count++;
  });
  return (
    1
  );
}

renderRoot(<Test />, document.getElementById("app"));
